import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isTokenColour, nameColour, openPage, pageUrl, renderedOffences, tokenNames } from './browser.mjs';
import { loadTokens } from './tokens.mjs';

/**
 * The samples page (roadmap P1.6): the terminal colours on a mock Konsole and
 * the editor theme on a mock Kate. Every coloured run of text is a span whose
 * one class names its token, so a misspelt class cannot fall back unseen.
 */

const SAMPLES = 'prototype/samples.html';
const BROWSER = fileURLToPath(new URL('../bin/browser.mjs', import.meta.url));
const REPO = fileURLToPath(new URL('../../../', import.meta.url));

const tokens = loadTokens();
const names = tokenNames(tokens);

const COLOURS = [ 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white' ];
const PALETTE = [ ...COLOURS.map(c => `ansi-${c}`), ...COLOURS.map(c => `ansi-bright-${c}`) ];
const SYNTAX = [ 'keyword', 'function', 'type', 'string', 'number', 'preprocessor', 'comment' ];

/** The token a span's class names: `ansi-x` reads `ansi-x`, `syn-x` reads `syntax-x`. */
const tokenOfClass = name => (name.startsWith('syn-') ? `syntax-${name.slice(4)}` : name);

const coloursOf = (page, selector, read = [ 'background-color', 'color' ]) =>
  page
    .locator(selector)
    .first()
    .evaluate((element, names) => {
      const style = getComputedStyle(element);
      return names.map(name => style.getPropertyValue(name).trim());
    }, read);

/** Offences for an element whose colours are not the tokens expected, in the order read. */
async function expectTokens(page, selector, expected, read) {
  const shown = await coloursOf(page, selector, read);
  return expected
    .map((token, index) => (isTokenColour(shown[index], token, names) ? null : `${selector}: ${nameColour(shown[index], names)}, expected ${token}`))
    .filter(Boolean);
}

let chrome = {};
before(async () => {
  try {
    const { browser } = await openPage(pageUrl('prototype/index.html'));
    await browser.close();
  } catch (error) {
    chrome = { skip: error.message };
  }
});

const withChrome = (name, test) => it(name, t => (chrome.skip ? t.skip(chrome.skip) : test()));

let opened;
after(() => opened?.browser.close());

async function samples() {
  opened ??= await openPage(pageUrl(SAMPLES));
  const { page } = opened;
  await page.reload({ waitUntil: 'load' });
  await page.mouse.move(0, 0);
  return opened;
}

describe('prototype samples', () => {
  withChrome('colours every span from its token', async () => {
    const { page } = await samples();
    const spans = await page.locator('.sample *, .ansi-palette *').evaluateAll(elements =>
      elements
        .map(element => ({
          classes: [ ...element.classList ].filter(name => /^(ansi|syn)-/.test(name)),
          colour: getComputedStyle(element).color,
          text: element.textContent.slice(0, 20)
        }))
        .filter(span => span.classes.length)
    );
    assert.ok(spans.length > 0, 'no coloured span');
    const offences = [];
    for (const { classes, colour, text } of spans) {
      if (classes.length > 1) {
        offences.push(`"${text}": two classes, ${classes.join(' ')}`);
        continue;
      }
      const token = tokenOfClass(classes[0]);
      if (!tokens.has(token)) {
        offences.push(`"${text}": ${classes[0]} names no token`);
      } else if (!isTokenColour(colour, token, names)) {
        offences.push(`"${text}": ${nameColour(colour, names)}, expected ${token}`);
      }
    }
    assert.deepEqual(offences, []);
  });

  withChrome('shows all sixteen ANSI colours', async () => {
    const { page } = await samples();
    const cells = await page.locator('.ansi-palette > *').evaluateAll(elements => elements.map(element => element.className));
    assert.deepEqual(cells, PALETTE);
  });

  withChrome('draws the terminal on its own tokens', async () => {
    const { page } = await samples();
    const offences = [
      ...(await expectTokens(page, '.konsole .terminal', [ 'terminal', 'terminal-text' ])),
      ...(await expectTokens(page, '.konsole .tab-bar', [ 'tone-0' ], [ 'background-color' ])),
      ...(await expectTokens(page, '.konsole .tab.is-selected', [ 'tone-2', 'accent' ], [ 'background-color', '--marker' ]))
    ];
    assert.deepEqual(offences, []);
  });

  withChrome('uses every bright and normal colour in the session', async () => {
    const { page } = await samples();
    const used = new Set(
      await page.locator('.konsole .terminal [class]').evaluateAll(elements => elements.map(element => element.className))
    );
    const missing = COLOURS.filter(c => ![ 'black', 'white' ].includes(c) && !used.has(`ansi-${c}`));
    assert.deepEqual(missing, []);
    assert.ok([ ...used ].filter(name => name.startsWith('ansi-bright-')).length >= 3, [ ...used ].join(', '));
  });

  withChrome('draws the samples with no line', async () => {
    let { page, problems } = await samples();
    assert.deepEqual(problems, []);
    const offences = (await renderedOffences(page)).map(o => `at rest: ${o}`);
    ({ page } = await samples());
    await page.locator('.kate .code').hover();
    offences.push(...(await renderedOffences(page)).map(o => `pointer over the code: ${o}`));
    assert.deepEqual(offences, []);
    const { status, stdout } = spawnSync(process.execPath, [ BROWSER, 'check', SAMPLES ], { cwd: REPO, encoding: 'utf8' });
    assert.equal(status, 0, stdout);
    assert.ok(stdout.trim().endsWith('0 load problems, 0 anti-goal offences.'), stdout);
  });

  withChrome('draws the editor on its own tokens', async () => {
    const { page } = await samples();
    const offences = [
      ...(await expectTokens(page, '.kate .code', [ 'editor', 'text' ])),
      ...(await expectTokens(page, '.kate .gutter', [ 'editor-gutter', 'text-dim' ])),
      ...(await expectTokens(page, '.kate .current-line', [ 'editor-current-line' ], [ 'background-color' ])),
      ...(await expectTokens(page, '.kate .current-line-number', [ 'text' ], [ 'color' ])),
      ...(await expectTokens(page, '.kate .text-selection', [ 'editor-selection' ], [ 'background-color' ]))
    ];
    assert.deepEqual(offences, []);
  });

  withChrome('uses every syntax colour', async () => {
    const { page } = await samples();
    const used = new Set(await page.locator('.kate .code [class]').evaluateAll(elements => elements.map(element => element.className)));
    assert.deepEqual(SYNTAX.filter(kind => !used.has(`syn-${kind}`)), []);
  });

  withChrome('lines up the gutter with the code', async () => {
    const { page } = await samples();
    const tops = selector => page.locator(selector).evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
    const numbers = await tops('.kate .line-number');
    const lines = await tops('.kate .line');
    assert.equal(lines.length, 17);
    assert.equal(numbers.length, lines.length);
    const off = lines.map((top, index) => [ index + 1, numbers[index] - top ]).filter(([ , gap ]) => Math.abs(gap) > 0.5);
    assert.deepEqual(off, []);
  });
});
