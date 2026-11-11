// Opens prototype pages in the installed Google Chrome through playwright-core
// (D-45, D-46). The parts here that need no browser are tested without one.
import { existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { UsageError } from './cli.mjs';
import { describeColour, parseColour, srgb8 } from './colour.mjs';
import { resolveToken } from './tokens.mjs';

/** The repository's root folder. */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');

/** True when `path` is `folder` or inside it. */
const isInside = (folder, path) => {
  const rel = relative(folder, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};

/** A path with every link followed, as far as the path exists. */
function real(path) {
  const rest = [];
  let head = path;
  while (!existsSync(head)) {
    rest.unshift(basename(head));
    head = dirname(head);
  }
  return join(realpathSync(head), ...rest);
}

/** The `file://` URL of a page, given relative to `root` or absolute. */
export function pageUrl(path, root = REPO_ROOT) {
  const file = resolve(root, path);
  if (!existsSync(file)) {
    throw new Error(`No such page: ${path}`);
  }
  return pathToFileURL(file).href;
}

/**
 * Where a screenshot is written: `tmp/<name>.png` in the repository by
 * default (gitignored). Tool rule 6: only inside the repository or the
 * system's temporary folder, after following links.
 */
export function outPath(path, { name, root = REPO_ROOT, temp = tmpdir() }) {
  if (path === undefined) {
    return join(root, 'tmp', `${name}.png`);
  }
  if (!path.endsWith('.png')) {
    throw new UsageError(`Not a .png file: ${path}`);
  }
  const file = resolve(root, path);
  const target = real(file);
  if (!isInside(real(root), target) && !isInside(real(temp), target)) {
    throw new UsageError(`Will not write outside the repository and the temporary folder: ${path}`);
  }
  return file;
}

/** Reads a computed colour: `rgb()`, `rgba()`, `color(srgb …)`, `oklch()` and the rest. */
export function parseCssColour(text) {
  let colour;
  try {
    colour = parseColour(text);
  } catch {
    throw new Error(`Not a computed colour: ${text}`);
  }
  return srgb8(colour);
}

const hexOf = ({ r, g, b }) => describeColour(parseColour(`rgb(${r} ${g} ${b})`)).hex;

/** The hex of every opaque colour token, mapped to its names in file order. */
export function tokenNames(tokens) {
  const names = new Map();
  for (const [ name, value ] of tokens) {
    if (value.length) {
      continue;
    }
    const { colour } = resolveToken(tokens, name);
    if ((colour.alpha ?? 1) < 1) {
      continue;
    }
    const hex = describeColour(colour).hex;
    names.set(hex, [ ...(names.get(hex) ?? []), name ]);
  }
  return names;
}

/** A computed colour, named as tokens where one matches: `#1c1a18 (tone-1)`. */
export function nameColour(text, names) {
  const colour = parseCssColour(text);
  if (colour.alpha === 0) {
    return 'transparent';
  }
  if (colour.alpha < 1) {
    return `rgb(${colour.r} ${colour.g} ${colour.b} / ${+(colour.alpha * 100).toFixed(2)}%)`;
  }
  const hex = hexOf(colour);
  const tokens = names.get(hex);
  return tokens ? `${hex} (${tokens.join(', ')})` : hex;
}

/**
 * Opens `url` in the installed Chrome, headless, at device scale 1. Headless
 * Chrome hides scrollbars; `scrollbars: true` shows them. Returns
 * the browser (the caller closes it), the page, and the problems seen while
 * loading: failed requests, console errors and script errors.
 */
export async function openPage(url, { width = 1300, height = 900, scrollbars = false } = {}) {
  const { chromium } = await import('playwright-core');
  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      ignoreDefaultArgs: scrollbars ? [ '--hide-scrollbars' ] : []
    });
  } catch (error) {
    throw new Error(
      `Google Chrome could not be started (playwright-core uses the installed Chrome): ${error.message.split('\n')[0]}`
    );
  }
  const problems = [];
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    page.on('requestfailed', request => {
      const target = request.url().startsWith('file:') ? relative(REPO_ROOT, fileURLToPath(request.url())) : request.url();
      problems.push(`failed to load ${target} (${request.failure()?.errorText})`);
    });
    page.on('console', message => {
      // A failed load is reported once, by its request.
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
        problems.push(`console: ${message.text()}`);
      }
    });
    page.on('pageerror', error => problems.push(`script error: ${error.message}`));
    await page.goto(url, { waitUntil: 'load' });
    return { browser, page, problems };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/** The one element a selector matches; anything else is an error. */
export async function only(page, selector) {
  const locator = page.locator(selector);
  const count = await locator.count();
  if (count !== 1) {
    throw new Error(`${selector} matches ${count} elements`);
  }
  return locator;
}

/** Puts elements in a state: focused, hovered, or pressed (held down). */
export async function applyState(page, { hover, focus, press } = {}) {
  if (focus) {
    await (await only(page, focus)).focus();
  }
  if (hover) {
    await (await only(page, hover)).hover();
  }
  if (press) {
    await (await only(page, press)).hover();
    await page.mouse.down();
  }
}

/**
 * The anti-goals as Chrome draws them: a border, a rounded corner (a circle
 * of 50 % on a square element is a round widget and passes), a box
 * shadow, an underline, an outline anywhere but on a `.window`, or a line
 * drawn as a box: an element less than 3 px thick (the least size of a block
 * marker or a well edge) that paints a background. Looks at every element and
 * at its ::before and ::after.
 */
export function renderedOffences(page) {
  return page.evaluate(() => {
    const offences = [];
    const label = element =>
      element.tagName.toLowerCase() + [ ...element.classList ].map(name => `.${name}`).join('');
    for (const element of document.querySelectorAll('*')) {
      for (const pseudo of [ null, '::before', '::after' ]) {
        const style = getComputedStyle(element, pseudo);
        if (pseudo && style.content === 'none') {
          continue;
        }
        const where = label(element) + (pseudo ?? '');
        const report = text => offences.push(`${where}: ${text}`);
        for (const side of [ 'top', 'right', 'bottom', 'left' ]) {
          const width = style.getPropertyValue(`border-${side}-width`);
          const lineStyle = style.getPropertyValue(`border-${side}-style`);
          if (width !== '0px' && lineStyle !== 'none') {
            report(`border-${side} ${width} ${lineStyle}`);
          }
        }
        // A round widget, a circle by convention, is not a rounded corner.
        const box = pseudo ? null : element.getBoundingClientRect();
        const round = style.borderRadius === '50%' && box && box.width > 0 && box.width === box.height;
        if (style.borderRadius !== '0px' && !round) {
          report(`border-radius ${style.borderRadius}`);
        }
        if (style.boxShadow !== 'none') {
          report(`box-shadow ${style.boxShadow}`);
        }
        if (style.textDecorationLine !== 'none') {
          report(`text-decoration-line ${style.textDecorationLine}`);
        }
        if (style.outlineStyle !== 'none' && !(pseudo === null && element.classList.contains('window'))) {
          report(`outline ${style.outlineWidth} ${style.outlineStyle}`);
        }
        if (box && box.width > 0 && box.height > 0 && Math.min(box.width, box.height) < 3) {
          const painted = style.backgroundImage !== 'none' || !/^rgba\(\d+, \d+, \d+, 0\)$|^transparent$/.test(style.backgroundColor);
          if (painted) {
            report(`a line ${Math.round(box.width)} × ${Math.round(box.height)} px`);
          }
        }
      }
    }
    return offences;
  });
}
