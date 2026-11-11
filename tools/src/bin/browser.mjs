#!/usr/bin/env node
import { mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative } from 'node:path';
import {
  applyState,
  nameColour,
  only,
  openPage,
  outPath,
  pageUrl,
  REPO_ROOT,
  renderedOffences,
  tokenNames
} from '../lib/browser.mjs';
import { main, print, table, UsageError } from '../lib/cli.mjs';
import { loadTokens } from '../lib/tokens.mjs';

const STATES = [ 'hover', 'focus', 'press' ];

const STATE_OPTIONS = {
  hover: { type: 'string' },
  focus: { type: 'string' },
  press: { type: 'string' }
};

const SIZE_OPTIONS = { width: { type: 'string' }, height: { type: 'string' } };

const STATE_HELP = `--hover, --focus and --press each take a CSS selector that must match exactly
one element: it is hovered, focused (as by the keyboard, so :focus-visible
applies) or held down, before anything is measured or saved.`;

const SIZE_HELP = '--width and --height set the viewport, 200 to 4000 pixels; the default is 1300 × 900.';

/** A viewport size from the command line. */
function size(option, text, fallback) {
  if (text === undefined) {
    return fallback;
  }
  const value = Number(text);
  if (!/^\d+$/.test(text) || value < 200 || value > 4000) {
    throw new UsageError(`--${option} must be a whole number from 200 to 4000: ${text}`);
  }
  return value;
}

const viewport = options => ({ width: size('width', options.width, 1300), height: size('height', options.height, 900) });

/** The page argument, checked before Chrome starts. */
function page(positionals) {
  if (!positionals[0]) {
    throw new UsageError('Give a page, such as prototype/index.html');
  }
  return pageUrl(positionals[0]);
}

/** Opens the page, runs `work`, and always closes Chrome. */
async function withPage(url, options, work) {
  const { browser, page: opened, problems } = await openPage(url, viewport(options));
  try {
    return await work(opened, problems);
  } finally {
    await browser.close();
  }
}

const words = text => (text.match(/[a-z0-9]+/gi) ?? []).join('-');

/** `index-scene-front-is-close-hover`. */
const defaultName = (file, options) =>
  [ basename(file, '.html'), words(options.selector ?? ''), ...STATES.filter(state => options[state]) ]
    .filter(Boolean)
    .join('-');

/** A path inside the repository relative to it; any other path as it is. */
function shown(file) {
  const rel = relative(REPO_ROOT, file);
  return rel.startsWith('..') || isAbsolute(rel) ? file : rel;
}

/** Width and height from a PNG's header. */
function pngSize(file) {
  const header = readFileSync(file).subarray(16, 24);
  return { width: header.readUInt32BE(0), height: header.readUInt32BE(4) };
}

main({
  name: 'browser',
  summary: 'Opens a prototype page in the installed Google Chrome: screenshots, the rendered anti-goal check, computed colours.',
  commands: {
    shot: {
      usage: '<page> [--selector css] [--hover css] [--focus css] [--press css] [--out file.png] [--full] [--width n] [--height n] [--json]',
      summary: 'Saves a PNG of one element, the viewport, or the whole page (--full), in a state.',
      help: `${STATE_HELP}\n\n${SIZE_HELP}\n\n--out defaults to tmp/<page>-<selector>-<states>.png in the repository (gitignored). It may be
another path inside the repository or inside the system's temporary folder, such as /tmp;
links are followed before deciding.`,
      options: { selector: { type: 'string' }, out: { type: 'string' }, full: { type: 'boolean' }, ...STATE_OPTIONS, ...SIZE_OPTIONS, json: { type: 'boolean' } },
      async run(options, positionals) {
        const url = page(positionals);
        const file = outPath(options.out, { name: defaultName(positionals[0], options) });
        viewport(options);
        await withPage(url, options, async opened => {
          await applyState(opened, options);
          mkdirSync(dirname(file), { recursive: true });
          if (options.selector) {
            await (await only(opened, options.selector)).screenshot({ path: file });
          } else {
            await opened.screenshot({ path: file, fullPage: Boolean(options.full) });
          }
        });
        const result = { path: shown(file), ...pngSize(file) };
        print(options.json, result, () => `Saved ${result.path} (${result.width} × ${result.height})`);
      }
    },
    check: {
      usage: '<page> [--hover css] [--focus css] [--press css] [--width n] [--height n] [--json]',
      summary: 'Lists load problems and anti-goals as Chrome draws the page, in a state; exits 1 if there is any.',
      help: `Load problems: a file that fails to load, a console error, a script error.
Anti-goals: a border, a rounded corner, a box shadow, an underline, or an
outline anywhere but on .window, on any element or its ::before and ::after.
A circle of 50 % on a square element is a round widget and passes.

${STATE_HELP}

${SIZE_HELP}`,
      options: { ...STATE_OPTIONS, ...SIZE_OPTIONS, json: { type: 'boolean' } },
      async run(options, positionals) {
        const url = page(positionals);
        viewport(options);
        const result = await withPage(url, options, async (opened, problems) => {
          await applyState(opened, options);
          return { problems: [ ...problems ], offences: await renderedOffences(opened) };
        });
        print(options.json, result, () =>
          [
            ...result.problems,
            ...result.offences,
            `${result.problems.length} load problems, ${result.offences.length} anti-goal offences.`
          ].join('\n')
        );
        return result.problems.length || result.offences.length ? 1 : 0;
      }
    },
    colours: {
      usage: '<page> <selector> [--hover css] [--focus css] [--press css] [--width n] [--height n] [--json]',
      summary: 'Prints the computed background and text colour of each element matched, named as tokens.',
      help: `${STATE_HELP}\n\n${SIZE_HELP}`,
      options: { ...STATE_OPTIONS, ...SIZE_OPTIONS, json: { type: 'boolean' } },
      async run(options, positionals) {
        const url = page(positionals);
        const selector = positionals[1];
        if (!selector) {
          throw new UsageError('Give a CSS selector for the elements to measure');
        }
        viewport(options);
        const names = tokenNames(loadTokens());
        const rows = await withPage(url, options, async opened => {
          await applyState(opened, options);
          const found = await opened.locator(selector).evaluateAll(elements =>
            elements.map(element => {
              const style = getComputedStyle(element);
              return {
                element: element.tagName.toLowerCase() + [ ...element.classList ].map(name => `.${name}`).join(''),
                background: style.backgroundColor,
                colour: style.color
              };
            })
          );
          if (!found.length) {
            throw new Error(`${selector} matches no element`);
          }
          return found.map(row => ({ ...row, background: nameColour(row.background, names), colour: nameColour(row.colour, names) }));
        });
        print(options.json, rows, () =>
          table([ [ 'element', 'background', 'colour' ], ...rows.map(r => [ r.element, r.background, r.colour ]) ])
        );
      }
    }
  }
});
