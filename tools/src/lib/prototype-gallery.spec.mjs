import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyState, nameColour, openPage, pageUrl, renderedOffences, tokenNames } from './browser.mjs';
import { loadTokens } from './tokens.mjs';

/**
 * The gallery (roadmap P1.3): every widget in every state, side by side. Each
 * state cell holds a copy of the control with its state forced by a class
 * (`.is-hovered`, `.is-focused`, `.is-pressed`, `.is-checked`) or by
 * `disabled`. In Chrome, each copy must be drawn in the tones the design
 * language gives it, and a live control put in a real state must look the
 * same as its forced copy.
 */

const GALLERY = 'prototype/gallery.html';
const SOURCE = fileURLToPath(new URL(`../../../${GALLERY}`, import.meta.url));

const RAISED = {
  rest: [ 'tone-3', 'text' ],
  hovered: [ 'tone-4', 'text' ],
  focused: [ 'raised-focus', 'text' ],
  pressed: [ 'tone-1', 'text' ],
  disabled: [ 'tone-3', 'text-dim' ]
};

const WELL = {
  rest: [ 'well', 'text' ],
  hovered: [ 'tone-1', 'text' ],
  focused: [ 'well-focus', 'text' ],
  disabled: [ 'well', 'text-dim' ]
};

// Each widget: `control`, the element whose colours are read; `target`, the
// element that is put in a state (the control when left out); and `states`,
// each state's [background, text] as tokens. The order is the page's.
const WIDGETS = {
  button: { control: '.button', states: RAISED },
  primary: {
    control: '.button.is-primary',
    states: {
      rest: [ 'accent', 'on-accent' ],
      hovered: [ 'accent-hover', 'on-accent' ],
      focused: [ 'accent-hover', 'on-accent' ],
      pressed: [ 'accent-pressed', 'on-accent' ],
      disabled: [ 'tone-3', 'text-dim' ]
    }
  },
  'tool-button': {
    control: '.tool-button',
    states: {
      rest: [ 'transparent', 'text' ],
      hovered: [ 'tone-3', 'text' ],
      focused: [ 'raised-focus', 'text' ],
      pressed: [ 'tone-2', 'text' ],
      checked: [ 'tone-3', 'accent' ],
      disabled: [ 'transparent', 'text-dim' ]
    }
  },
  combo: { control: '.combo', states: RAISED },
  'text-field': {
    control: '.text-field',
    states: { rest: WELL.rest, filled: [ 'well', 'text' ], hovered: WELL.hovered, focused: WELL.focused, disabled: WELL.disabled }
  },
  spin: { control: '.spin', target: '.spin .spin-field', states: WELL },
  'text-area': { control: '.text-area', states: WELL }
};

const FORCED = { hovered: 'is-hovered', focused: 'is-focused', pressed: 'is-pressed', checked: 'is-checked' };
const LIVE = { hovered: 'hover', focused: 'focus', pressed: 'press' };

const cell = (widget, state) => `[data-widget="${widget}"] [data-state="${state}"]`;
const controlOf = (widget, state) => `${cell(widget, state)} ${WIDGETS[widget].control}`;
const targetOf = (widget, state) => `${cell(widget, state)} ${WIDGETS[widget].target ?? WIDGETS[widget].control}`;

/** The rows of the gallery outside any candidate: widget → [{ state, body }]. */
function readRows() {
  const source = readFileSync(SOURCE, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<figure[\s\S]*?<\/figure>/g, '');
  const rows = new Map();
  for (const [ , widget, body ] of source.matchAll(
    /<div class="state-row" data-widget="([^"]+)">([\s\S]*?)(?=<div class="state-row"|<\/section>)/g
  )) {
    const cells = [ ...body.matchAll(/data-state="([^"]+)"([\s\S]*?)(?=data-state="|$)/g) ].map(([ , state, text ]) => ({
      state,
      body: text
    }));
    rows.set(widget, cells);
  }
  return rows;
}

/** The first tag in `body` whose classes include every class of `selector`. */
function controlTag(body, selector) {
  const wanted = selector.split('.').filter(Boolean);
  for (const [ tag, classes ] of body.matchAll(/<[a-z]+\b[^>]*\bclass="([^"]*)"[^>]*>/g)) {
    const list = classes.split(/\s+/);
    if (wanted.every(name => list.includes(name))) {
      return { tag, classes: list };
    }
  }
  return null;
}

const names = tokenNames(loadTokens());

/** Whether a computed colour is the token expected: `transparent`, or among its names. */
function isToken(computed, expected) {
  const named = nameColour(computed, names);
  if (expected === 'transparent') {
    return named === 'transparent';
  }
  return (named.match(/\((.*)\)$/)?.[1].split(', ') ?? []).includes(expected);
}

const coloursOf = (page, selector) =>
  page.locator(selector).evaluate(element => {
    const style = getComputedStyle(element);
    return [ style.backgroundColor, style.color ];
  });

// The tests that need Chrome are skipped, with the reason, when it cannot start.
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

/** The gallery in Chrome, opened once and reset before each use. */
async function gallery() {
  opened ??= await openPage(pageUrl(GALLERY));
  const { page } = opened;
  await page.mouse.up();
  await page.reload({ waitUntil: 'load' });
  await page.mouse.move(0, 0);
  return opened;
}

describe('prototype gallery', () => {
  it('shows every state of every widget', () => {
    const rows = readRows();
    assert.deepEqual([ ...rows.keys() ], Object.keys(WIDGETS));
    for (const [ widget, { states } ] of Object.entries(WIDGETS)) {
      assert.deepEqual(rows.get(widget).map(c => c.state), Object.keys(states), widget);
    }
  });

  it('forces each state on its copy', () => {
    const offences = [];
    for (const [ widget, cells ] of readRows()) {
      for (const { state, body } of cells) {
        const found = controlTag(body, WIDGETS[widget]?.control ?? `.${widget}`);
        if (!found) {
          offences.push(`${widget} ${state}: no control`);
          continue;
        }
        const forced = found.classes.filter(name => Object.values(FORCED).includes(name));
        const expected = FORCED[state] ? [ FORCED[state] ] : [];
        if (forced.join() !== expected.join()) {
          offences.push(`${widget} ${state}: forced ${forced.join(' ') || 'nothing'}, expected ${expected.join(' ') || 'nothing'}`);
        }
        const target = WIDGETS[widget]?.target?.split(' ').at(-1);
        const disabledOn = target ? controlTag(body, target)?.tag ?? '' : found.tag;
        if (/\sdisabled\b/.test(disabledOn) !== (state === 'disabled')) {
          offences.push(`${widget} ${state}: disabled is ${state === 'disabled' ? 'missing' : 'set'}`);
        }
      }
    }
    assert.deepEqual(offences, []);
  });

  withChrome('draws each state in its tones', async () => {
    const { page } = await gallery();
    const offences = [];
    for (const [ widget, { states } ] of Object.entries(WIDGETS)) {
      for (const [ state, [ background, text ] ] of Object.entries(states)) {
        const [ shownBackground, shownText ] = await coloursOf(page, controlOf(widget, state));
        if (!isToken(shownBackground, background)) {
          offences.push(`${widget} ${state}: background ${nameColour(shownBackground, names)}, expected ${background}`);
        }
        if (!isToken(shownText, text)) {
          offences.push(`${widget} ${state}: text ${nameColour(shownText, names)}, expected ${text}`);
        }
      }
    }
    assert.deepEqual(offences, []);
  });

  withChrome('reacts as its forced copy shows', async () => {
    const offences = [];
    for (const [ widget, { states } ] of Object.entries(WIDGETS)) {
      for (const state of Object.keys(states).filter(s => LIVE[s])) {
        const { page } = await gallery();
        const forced = await coloursOf(page, controlOf(widget, state));
        await applyState(page, { [LIVE[state]]: targetOf(widget, 'rest') });
        const live = await coloursOf(page, controlOf(widget, 'rest'));
        if (live.join() !== forced.join()) {
          offences.push(`${widget} ${state}: live ${live.map(c => nameColour(c, names)).join(' / ')}, forced ${forced.map(c => nameColour(c, names)).join(' / ')}`);
        }
      }
    }
    assert.deepEqual(offences, []);
  });

  withChrome('keeps the precedence of states', async () => {
    const button = targetOf('button', 'rest');
    const read = async page => (await coloursOf(page, controlOf('button', 'rest'))).map(c => nameColour(c, names));

    let { page } = await gallery();
    await applyState(page, { focus: button, hover: button });
    assert.ok(isToken((await coloursOf(page, button))[0], 'raised-focus'), `focused and hovered: ${await read(page)}`);

    ({ page } = await gallery());
    await applyState(page, { focus: button, press: button });
    assert.ok(isToken((await coloursOf(page, button))[0], 'tone-1'), `focused and pressed: ${await read(page)}`);

    ({ page } = await gallery());
    const disabled = targetOf('button', 'disabled');
    await page.locator(disabled).hover({ force: true });
    const [ background, text ] = await coloursOf(page, disabled);
    assert.ok(isToken(background, 'tone-3') && isToken(text, 'text-dim'), `disabled and hovered: ${nameColour(background, names)}`);
  });

  withChrome('shows placeholders in dim text', async () => {
    const { page } = await gallery();
    const offences = [];
    for (const widget of [ 'text-field', 'text-area' ]) {
      for (const state of [ 'rest', 'focused' ]) {
        const colour = await page
          .locator(controlOf(widget, state))
          .evaluate(element => getComputedStyle(element, '::placeholder').color);
        if (!isToken(colour, 'text-dim')) {
          offences.push(`${widget} ${state}: placeholder ${nameColour(colour, names)}`);
        }
      }
    }
    assert.deepEqual(offences, []);
  });

  withChrome('takes the keyboard in order', async () => {
    const { page } = await gallery();
    // The pressed copy stays pressed when focused: pressed wins over focused.
    const expected = Object.entries(WIDGETS).flatMap(([ widget, { states } ]) =>
      Object.keys(states)
        .filter(state => state !== 'disabled')
        .map(state => `${widget} ${state}`)
    );
    await page.locator('.pages a').last().focus();
    const seen = [];
    const offences = [];
    for (let step = 0; step <= expected.length; step++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const element = document.activeElement;
        const cell = element?.closest('.family [data-state]');
        return cell
          ? {
              label: `${cell.closest('[data-widget]').dataset.widget} ${cell.dataset.state}`,
              step: element.classList.contains('spin-step')
            }
          : null;
      });
      if (!where) {
        break;
      }
      seen.push(where.label);
      if (where.step) {
        offences.push(`${where.label}: a spin step takes focus`);
      }
      const [ widget, state ] = where.label.split(' ');
      if (state !== 'pressed') {
        const [ background ] = await coloursOf(page, controlOf(widget, state));
        const focused = WIDGETS[widget].states.focused[0];
        if (!isToken(background, focused)) {
          offences.push(`${where.label}: focused shows ${nameColour(background, names)}, expected ${focused}`);
        }
      }
    }
    assert.deepEqual(seen, expected);
    assert.deepEqual(offences, []);
  });

  withChrome('draws no well edge at the start', async () => {
    // At the start the well edge has no width, so no bar shows in any state.
    const { page } = await gallery();
    const offences = [];
    for (const widget of [ 'text-field', 'spin', 'text-area' ]) {
      for (const state of Object.keys(WIDGETS[widget].states)) {
        const image = await page.locator(controlOf(widget, state)).evaluate(element => getComputedStyle(element).backgroundImage);
        if (image !== 'none' && !/\b0px\b/.test(image)) {
          offences.push(`${widget} ${state}: ${image}`);
        }
      }
    }
    assert.deepEqual(offences, []);
  });

  withChrome('shows no spin buttons in a number field', async () => {
    const { page } = await gallery();
    const appearance = await page
      .locator(controlOf('spin', 'rest'))
      .locator('.spin-field')
      .evaluate(element => getComputedStyle(element).appearance);
    assert.equal(appearance, 'textfield');
  });

  withChrome('breaks no anti-goal in any state', async () => {
    let { page, problems } = await gallery();
    assert.deepEqual(problems, []);
    const offences = (await renderedOffences(page)).map(o => `at rest: ${o}`);
    for (const [ widget, { states } ] of Object.entries(WIDGETS)) {
      for (const state of Object.keys(states).filter(s => LIVE[s])) {
        ({ page } = await gallery());
        await applyState(page, { [LIVE[state]]: targetOf(widget, 'rest') });
        offences.push(...(await renderedOffences(page)).map(o => `${widget} ${state}: ${o}`));
      }
    }
    assert.deepEqual(offences, []);
  });
});
