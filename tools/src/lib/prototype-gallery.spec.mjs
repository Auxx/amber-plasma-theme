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
const SCROLLBARS_CSS = fileURLToPath(new URL('../../../prototype/scrollbars.css', import.meta.url));

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

const TOGGLE_OFF = {
  rest: [ 'toggle', 'transparent' ],
  hovered: [ 'tone-1', 'transparent' ],
  focused: [ 'toggle-focus', 'transparent' ],
  disabled: [ 'toggle', 'transparent' ]
};

const TOGGLE_ON = {
  rest: [ 'accent', 'on-accent' ],
  hovered: [ 'accent-hover', 'on-accent' ],
  focused: [ 'accent-hover', 'on-accent' ],
  disabled: [ 'toggle', 'text-dim' ]
};

const MARKED = [ 'background-color', '--mark' ];

// Tabs and items: background, text, and the block marker's colour.
const MARKED_ITEM = [ 'background-color', 'color', '--marker' ];

// Each widget: `control`, the element whose colours are read; `target`, the
// element that is put in a state (the control when left out); `read`, the two
// properties read (background and text when left out; a name starting with
// `--` is a custom property); `checked`, whether every cell is checked; and
// `states`, each state's tokens for `read`, in order. A state with one token
// checks only the first property. The order is the page's. A widget is in the
// keyboard order when it has a `focused` state.
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
  'text-area': { control: '.text-area', states: WELL },
  'check-box': { control: '.check-box', read: MARKED, states: TOGGLE_OFF },
  'check-box-on': { control: '.check-box', read: MARKED, checked: true, states: TOGGLE_ON },
  radio: { control: '.radio', read: MARKED, states: TOGGLE_OFF },
  'radio-on': { control: '.radio', read: MARKED, checked: true, states: TOGGLE_ON },
  slider: {
    control: '.slider',
    read: [ '--thumb', '--fill' ],
    states: {
      rest: [ 'tone-3', 'accent' ],
      hovered: [ 'tone-4', 'accent' ],
      focused: [ 'raised-focus', 'accent' ],
      pressed: [ 'tone-1', 'accent' ],
      disabled: [ 'tone-3', 'text-dim' ]
    }
  },
  progress: {
    control: '.progress',
    read: [ 'background-color', '--fill' ],
    states: {
      rest: [ 'track', 'accent' ],
      empty: [ 'track', 'accent' ],
      full: [ 'track', 'accent' ],
      disabled: [ 'track', 'text-dim' ]
    }
  },
  scrollbar: {
    control: '.scroll-thumb',
    states: { rest: [ 'scroll-thumb' ], hovered: [ 'text-dim' ], pressed: [ 'text' ] }
  },
  tab: {
    control: '.tab',
    read: MARKED_ITEM,
    states: {
      rest: [ 'transparent', 'text', 'transparent' ],
      hovered: [ 'tone-1', 'text', 'transparent' ],
      focused: [ 'well-focus', 'text', 'transparent' ],
      selected: [ 'tone-2', 'text', 'accent' ],
      disabled: [ 'transparent', 'text-dim', 'transparent' ]
    }
  },
  item: {
    control: '.item',
    read: MARKED_ITEM,
    states: {
      rest: [ 'transparent', 'text', 'transparent' ],
      hovered: [ 'tone-3', 'text', 'transparent' ],
      focused: [ 'raised-focus', 'text', 'transparent' ],
      selected: [ 'selected', 'text', 'accent' ],
      disabled: [ 'transparent', 'text-dim', 'transparent' ]
    }
  }
};

const TOGGLES = [ 'check-box', 'check-box-on', 'radio', 'radio-on' ];

const FORCED = {
  hovered: 'is-hovered',
  focused: 'is-focused',
  pressed: 'is-pressed',
  checked: 'is-checked',
  selected: 'is-selected',
  sorted: 'is-sorted'
};
const LIVE = { hovered: 'hover', focused: 'focus', pressed: 'press' };

// The focus stops allowed outside every state cell: the live areas.
const LIVE_STOPS = [ '.scroll-area' ];

const cell = (widget, state) => `[data-widget="${widget}"] [data-state="${state}"]`;
const controlOf = (widget, state) => `${cell(widget, state)} ${WIDGETS[widget].control}`;
const targetOf = (widget, state) => `${cell(widget, state)} ${WIDGETS[widget].target ?? WIDGETS[widget].control}`;
const readOf = widget => WIDGETS[widget].read ?? [ 'background-color', 'color' ];

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

/** The computed values of `read` on the element; custom properties are trimmed. */
const coloursOf = (page, selector, read = [ 'background-color', 'color' ]) =>
  page
    .locator(selector)
    .evaluate((element, names) => {
      const style = getComputedStyle(element);
      return names.map(name => style.getPropertyValue(name).trim());
    }, read);

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

  it('starts each fill at its value', () => {
    const source = readFileSync(SOURCE, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const offences = [];
    let count = 0;
    for (const [ tag ] of source.matchAll(/<div\b[^>]*\bclass="progress\b[^"]*"[^>]*>/g)) {
      count++;
      const value = tag.match(/\saria-valuenow="([^"]*)"/)?.[1];
      const fill = tag.match(/style="--value: ([^";]*)"/)?.[1];
      if (value === undefined || fill !== `${value}%`) {
        offences.push(`${tag}: --value ${fill}, value ${value}`);
      }
    }
    assert.ok(count > 0, 'no progress bar');
    // A slider's fill is set by gallery.js from its value, so no slider repeats it.
    assert.deepEqual(source.match(/<input\b[^>]*class="slider[^>]*style=[^>]*>/g) ?? [], []);
    assert.deepEqual(offences, []);
    const values = readRows()
      .get('progress')
      .map(({ state, body }) => [ state, body.match(/aria-valuenow="([^"]*)"/)?.[1] ]);
    assert.deepEqual(values.slice(0, 3), [ [ 'rest', '40' ], [ 'empty', '0' ], [ 'full', '100' ] ]);
  });

  it('styles the real scrollbars as the drawn ones', () => {
    // A drawn thumb and a real one in the same state get the same background.
    // They sit in separate rules: a browser that does not know a
    // ::-webkit- pseudo-element drops every rule that names one.
    const rules = [ ...readFileSync(SCROLLBARS_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g) ].map(
      ([ , selector, body ]) => ({ selectors: selector.split(',').map(part => part.trim()), body })
    );
    const offences = rules
      .filter(({ selectors }) => selectors.some(sel => sel.includes('::-webkit-')) && selectors.some(sel => !sel.includes('::-webkit-')))
      .map(({ selectors }) => `${selectors.join(', ')}: mixes ::-webkit- with other selectors`);
    const declared = (selector, property) =>
      rules
        .filter(rule => rule.selectors.includes(selector))
        .map(rule => rule.body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`))?.[1].trim())
        .filter(Boolean)
        .at(-1);
    const STATES = {
      '::-webkit-scrollbar-thumb': [ '.scroll-thumb' ],
      '::-webkit-scrollbar-thumb:hover': [ '.scroll-thumb:hover', '.scroll-thumb.is-hovered' ],
      '::-webkit-scrollbar-thumb:active': [ '.scroll-thumb:active', '.scroll-thumb.is-pressed' ]
    };
    for (const [ real, drawn ] of Object.entries(STATES)) {
      const background = declared(real, 'background');
      if (!background) {
        offences.push(`${real}: no background`);
      }
      for (const selector of drawn) {
        if (declared(selector, 'background') !== background) {
          offences.push(`${selector}: background ${declared(selector, 'background')}, real thumb ${background}`);
        }
      }
    }
    for (const part of [ '::-webkit-scrollbar', '::-webkit-scrollbar-track', '::-webkit-scrollbar-corner' ]) {
      if (declared(part, 'background') !== 'transparent') {
        offences.push(`${part}: background ${declared(part, 'background')}, expected transparent`);
      }
    }
    if (declared('::-webkit-scrollbar-button', 'display') !== 'none') {
      offences.push('::-webkit-scrollbar-button: shown');
    }
    // On a focused scroll area (well focus) the thumb at rest would measure
    // 1.09:1, so it rises to dim text there, which keeps 5.01:1.
    if (declared('.scroll-area:focus-visible::-webkit-scrollbar-thumb', 'background') !== 'var(--text-dim)') {
      offences.push('.scroll-area:focus-visible::-webkit-scrollbar-thumb: expected var(--text-dim)');
    }
    assert.deepEqual(offences, []);
  });

  it('names the scroll area', () => {
    const tag = readFileSync(SOURCE, 'utf8').match(/<div class="scroll-area"[^>]*>/)?.[0] ?? '';
    assert.match(tag, /\srole="region"/);
    assert.match(tag, /\saria-label="Files"/);
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
        if (/\sdisabled\b|\saria-disabled="true"/.test(disabledOn) !== (state === 'disabled')) {
          offences.push(`${widget} ${state}: disabled is ${state === 'disabled' ? 'missing' : 'set'}`);
        }
        if (/\schecked\b/.test(found.tag) !== Boolean(WIDGETS[widget]?.checked)) {
          offences.push(`${widget} ${state}: checked is ${WIDGETS[widget]?.checked ? 'missing' : 'set'}`);
        }
      }
    }
    assert.deepEqual(offences, []);
  });

  withChrome('draws each state in its tones', async () => {
    const { page } = await gallery();
    const offences = [];
    for (const [ widget, { states } ] of Object.entries(WIDGETS)) {
      const read = readOf(widget);
      for (const [ state, expected ] of Object.entries(states)) {
        const shown = await coloursOf(page, controlOf(widget, state), read);
        expected.forEach((token, index) => {
          if (!isToken(shown[index], token)) {
            offences.push(`${widget} ${state}: ${read[index]} ${nameColour(shown[index], names)}, expected ${token}`);
          }
        });
      }
    }
    assert.deepEqual(offences, []);
  });

  withChrome('reacts as its forced copy shows', async () => {
    const offences = [];
    for (const [ widget, { states } ] of Object.entries(WIDGETS)) {
      for (const state of Object.keys(states).filter(s => LIVE[s])) {
        const { page } = await gallery();
        const forced = await coloursOf(page, controlOf(widget, state), readOf(widget));
        await applyState(page, { [LIVE[state]]: targetOf(widget, 'rest') });
        const live = await coloursOf(page, controlOf(widget, 'rest'), readOf(widget));
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

    const box = targetOf('check-box', 'rest');
    const boxBackground = async () => nameColour((await coloursOf(page, box, MARKED))[0], names);
    ({ page } = await gallery());
    await applyState(page, { focus: box, hover: box });
    assert.match(await boxBackground(), /toggle-focus/, 'check box focused and hovered');

    ({ page } = await gallery());
    await applyState(page, { press: box });
    assert.match(await boxBackground(), /tone-1/, 'check box pressed');
    await page.mouse.up();

    ({ page } = await gallery());
    const off = targetOf('check-box-on', 'disabled');
    await page.locator(off).hover({ force: true });
    const [ offBackground, mark ] = await coloursOf(page, off, MARKED);
    assert.ok(isToken(offBackground, 'toggle') && isToken(mark, 'text-dim'), `disabled checked and hovered: ${nameColour(offBackground, names)}`);

    // Selected items and tabs keep their marker when hovered or focused.
    const combined = [
      [ 'item', { hover: 'selected' }, [ 'tone-4', 'text', 'accent' ] ],
      [ 'item', { focus: 'selected' }, [ 'raised-focus', 'text', 'accent' ] ],
      [ 'tab', { hover: 'selected' }, [ 'tone-2', 'text', 'accent' ] ],
      [ 'tab', { focus: 'selected' }, [ 'well-focus', 'text', 'accent' ] ],
      [ 'item', { hover: 'disabled' }, [ 'transparent', 'text-dim', 'transparent' ] ]
    ];
    for (const [ widget, state, expected ] of combined) {
      ({ page } = await gallery());
      const [ [ live, where ] ] = Object.entries(state);
      const target = targetOf(widget, where);
      if (live === 'hover') {
        await page.locator(target).hover({ force: true });
      } else {
        await page.locator(target).focus();
      }
      const shown = await coloursOf(page, target, MARKED_ITEM);
      const label = `${widget} ${where} ${live}: ${shown.map(c => nameColour(c, names)).join(' / ')}`;
      assert.ok(expected.every((token, index) => isToken(shown[index], token)), label);
    }
  });

  withChrome('dims the label of a disabled toggle', async () => {
    const { page } = await gallery();
    const offences = [];
    for (const widget of TOGGLES) {
      for (const state of Object.keys(WIDGETS[widget].states)) {
        const [ colour ] = await coloursOf(page, `${cell(widget, state)} .toggle`, [ 'color' ]);
        const expected = state === 'disabled' ? 'text-dim' : 'text';
        if (!isToken(colour, expected)) {
          offences.push(`${widget} ${state}: label ${nameColour(colour, names)}, expected ${expected}`);
        }
      }
    }
    assert.deepEqual(offences, []);
  });

  withChrome('hovers the box from its label', async () => {
    const { page } = await gallery();
    const label = page.locator(`${cell('check-box', 'rest')} .toggle`);
    const { width, height } = await label.boundingBox();
    const position = { x: width - 4, y: height / 2 };
    const box = targetOf('check-box', 'rest');
    await label.hover({ position });
    assert.match(nameColour((await coloursOf(page, box))[0], names), /tone-1/, 'hovered from the label');
    await label.click({ position });
    assert.ok(await page.locator(box).isChecked(), 'a click on the label checks the box');
    assert.match(nameColour((await coloursOf(page, box))[0], names), /accent-hover/, 'checked and hovered');
  });

  withChrome('fills each slider to its value on load', async () => {
    const { page } = await gallery();
    const shown = await page.evaluate(() =>
      [ ...document.querySelectorAll('.slider') ].map(element => [ element.value, getComputedStyle(element).getPropertyValue('--value').trim() ])
    );
    assert.ok(shown.length > 0);
    assert.deepEqual(shown.filter(([ value, fill ]) => fill !== `${value}%`), []);
  });

  withChrome('fills a slider of any range', async () => {
    const { page } = await gallery();
    const fill = await page.locator(targetOf('slider', 'rest')).evaluate(element => {
      element.min = '20';
      element.max = '30';
      element.step = '1';
      element.value = '25';
      element.dispatchEvent(new Event('input'));
      return getComputedStyle(element).getPropertyValue('--value').trim();
    });
    assert.equal(fill, '50%');
  });

  withChrome('moves the fill with the value', async () => {
    const { page, problems } = await gallery();
    const slider = targetOf('slider', 'rest');
    const fill = () => page.locator(slider).evaluate(element => getComputedStyle(element).getPropertyValue('--value').trim());
    await page.locator(slider).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await fill(), '50%');
    await page.keyboard.press('End');
    assert.equal(await fill(), '100%');
    assert.deepEqual(problems, []);
  });

  withChrome('shows focus on the scroll area', async () => {
    // The keyboard walk ends at the scroll area, which Chrome makes a stop.
    const { page } = await gallery();
    const before = (await coloursOf(page, '.scroll-area'))[0];
    await page.locator(targetOf('slider', 'pressed')).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'scroll-area');
    const [ background ] = await coloursOf(page, '.scroll-area');
    assert.ok(isToken(background, 'well-focus'), `focused scroll area: ${nameColour(background, names)}, at rest ${nameColour(before, names)}`);
  });

  withChrome('scrolls the scroll area', async () => {
    const { page } = await gallery();
    const area = page.locator('.scroll-area');
    const size = await area.evaluate(element => [ element.scrollHeight, element.clientHeight ]);
    assert.ok(size[0] > size[1], `scroll height ${size[0]}, client height ${size[1]}`);
    await area.hover();
    await page.mouse.wheel(0, 60);
    await page.waitForFunction(() => document.querySelector('.scroll-area').scrollTop > 0);
  });

  withChrome('draws toggles and sliders with no native look', async () => {
    const { page } = await gallery();
    const shown = await page.evaluate(() =>
      [ ...document.querySelectorAll('.check-box, .radio') ].map(element => {
        const style = getComputedStyle(element);
        return [ element.classList.contains('radio') ? 'radio' : 'check-box', style.appearance, style.borderRadius ];
      })
    );
    assert.ok(shown.length > 0);
    const offences = shown
      .filter(([ kind, appearance, radius ]) => appearance !== 'none' || radius !== (kind === 'radio' ? '50%' : '0px'))
      .map(entry => entry.join(' '));
    assert.deepEqual(offences, []);
    const sliders = await page.evaluate(() =>
      [ ...document.querySelectorAll('.slider') ].map(element => getComputedStyle(element).appearance)
    );
    assert.ok(sliders.length > 0);
    assert.deepEqual(sliders.filter(appearance => appearance !== 'none'), []);
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
    // The walk runs on past the live areas (a scroll area, views, popups, a
    // dialog) to the candidates, so that families after a live area are
    // walked too. A stop outside every state cell must be a listed live stop.
    const { page } = await gallery();
    // The pressed copy stays pressed when focused: pressed wins over focused.
    const expected = Object.entries(WIDGETS)
      .filter(([ , { states } ]) => states.focused)
      .flatMap(([ widget, { states } ]) =>
      Object.keys(states)
        .filter(state => state !== 'disabled')
        .map(state => `${widget} ${state}`)
    );
    await page.locator('.pages a').last().focus();
    const seen = [];
    const offences = [];
    for (let step = 0; step < 300; step++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(stops => {
        const element = document.activeElement;
        if (!element || element === document.body || element.closest('.candidates')) {
          return { end: true };
        }
        const cell = element.closest('.family [data-state]');
        if (!cell) {
          return { live: stops.some(stop => element.matches(stop)), html: element.outerHTML.slice(0, 80) };
        }
        return {
          label: `${cell.closest('[data-widget]').dataset.widget} ${cell.dataset.state}`,
          step: element.classList.contains('spin-step')
        };
      }, LIVE_STOPS);
      if (where.end) {
        break;
      }
      if (!where.label) {
        if (!where.live) {
          offences.push(`an unlisted stop outside every cell: ${where.html}`);
        }
        continue;
      }
      seen.push(where.label);
      if (where.step) {
        offences.push(`${where.label}: a spin step takes focus`);
      }
      const [ widget, state ] = where.label.split(' ');
      if (state !== 'pressed') {
        const [ background ] = await coloursOf(page, controlOf(widget, state), readOf(widget));
        const focused = WIDGETS[widget].states.focused[0];
        if (!isToken(background, focused)) {
          offences.push(`${where.label}: focused shows ${nameColour(background, names)}, expected ${focused}`);
        }
      }
    }
    assert.deepEqual(seen, expected);
    assert.deepEqual(offences, []);
  });

  withChrome('keeps every column readable on a focused item', async () => {
    // Dim text on raised focus measures 2.58:1, so a focused item shows its
    // secondary columns in text.
    let { page } = await gallery();
    const offences = [];
    for (const state of Object.keys(WIDGETS.item.states)) {
      const [ colour ] = await coloursOf(page, `${cell('item', state)} .item-detail`, [ 'color' ]);
      const expected = state === 'focused' ? 'text' : 'text-dim';
      if (!isToken(colour, expected)) {
        offences.push(`item ${state}: detail ${nameColour(colour, names)}, expected ${expected}`);
      }
    }
    ({ page } = await gallery());
    await page.locator(targetOf('item', 'rest')).focus();
    const [ live ] = await coloursOf(page, `${cell('item', 'rest')} .item-detail`, [ 'color' ]);
    if (!isToken(live, 'text')) {
      offences.push(`item rest, live focus: detail ${nameColour(live, names)}, expected text`);
    }
    assert.deepEqual(offences, []);
  });

  withChrome('marks the selected item in the window shell', async () => {
    const { browser, page } = await openPage(pageUrl('prototype/index.html'));
    try {
      const shown = await page.evaluate(() =>
        [ ...document.querySelectorAll('.is-selected') ].map(element => {
          const style = getComputedStyle(element);
          return [ style.backgroundColor, style.getPropertyValue('--marker').trim() ];
        })
      );
      assert.ok(shown.length > 0);
      const offences = shown
        .filter(([ background, marker ]) => !isToken(background, 'selected') || !isToken(marker, 'accent'))
        .map(pair => pair.map(c => nameColour(c, names)).join(' / '));
      assert.deepEqual(offences, []);
    } finally {
      await browser.close();
    }
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
