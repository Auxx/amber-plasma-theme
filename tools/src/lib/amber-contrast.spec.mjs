import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkPairs, describePair, loadPairs, loadTokens } from './tokens.mjs';

/**
 * Amber's contrast pairs, measured from prototype/tokens.css and
 * prototype/contrast-pairs.json, so that a token change that breaks a pair
 * fails the tests (docs/architecture/accessibility.md).
 */

// Colour tokens that need no pair: the shadow shows no state (D-4), the
// window glow is a faint indicator with no minimum (D-60), and ANSI black is
// meant to match a dark background, so it is exempt (D-53). Every
// other colour token carries text, marks state or lies under text, and must be
// the foreground or a background layer of at least one pair
// (docs/architecture/accessibility.md, "How the check works").
const NO_PAIR = [ 'shadow', 'glow', 'ansi-black' ];

describe('Amber contrast pairs', () => {
  const tokens = loadTokens();
  const pairs = loadPairs();
  const results = checkPairs(tokens, pairs);

  it('finds the pairs', () => {
    assert.equal(pairs.length, 110);
  });

  it('resolves every token of every pair', () => {
    const missing = results.filter(r => r.status === 'missing').map(r => `${describePair(r.pair)}: ${r.error}`);
    assert.deepEqual(missing, []);
  });

  it('meets every minimum', () => {
    const failing = results
      .filter(r => r.status === 'fail')
      .map(r => `${describePair(r.pair)}: ${r.ratio.toFixed(2)} < ${r.pair.minimum}`);
    assert.deepEqual(failing, []);
  });

  it('puts every colour token in a pair', () => {
    const paired = new Set(pairs.flatMap(p => [ p.foreground, ...p.background ]));
    const unpaired = [ ...tokens ]
      .filter(([ name, value ]) => !value.length && !NO_PAIR.includes(name) && !paired.has(name))
      .map(([ name ]) => name);
    assert.deepEqual(unpaired, []);
  });

  it('settles dim text on tone 4', () => {
    const result = results.find(r => describePair(r.pair) === 'text-dim on tone-4');
    assert.equal(result.ratio.toFixed(2), '4.60');
    assert.equal(result.close, false);
  });

  it('holds the window outline at 2:1 (D-62)', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('outline on tone-2'), '2.05');
  });

  it('holds the focused tones (D-64, D-69)', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('raised-focus on tone-3'), '2.07');
    assert.equal(ratio('well-focus-edge on well-focus'), '8.40');
    assert.equal(ratio('text-dim on well-focus'), '6.86');
  });

  it('holds the well a tone step below the surface (D-75)', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('well on tone-2'), '1.16');
  });

  it('holds the toggles, tracks and thumbs (D-75)', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('toggle on tone-2'), '1.16');
    assert.equal(ratio('track on tone-2'), '1.16');
    assert.equal(ratio('accent on track'), '8.91');
    assert.equal(ratio('thumb on tone-2'), '1.36');
  });

  it('keeps a hovered checked toggle at 3:1 on its surface', () => {
    const result = results.find(r => describePair(r.pair) === 'accent-hover on tone-2');
    assert.equal(result.ratio.toFixed(2), '8.74');
    assert.equal(result.pair.minimum, 3);
  });

  it('holds the focused toggle (D-64)', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('toggle-focus on tone-2'), '1.74');
    assert.equal(ratio('toggle-focus on toggle'), '2.02');
  });

  it('marks a selected item at 3:1', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('accent on selected'), '5.63');
    assert.equal(ratio('accent on surface-focus'), '6.13');
    assert.equal(ratio('selected on tone-2'), '1.36');
    assert.equal(ratio('selected on tone-1'), '1.49');
  });

  it('keeps secondary text on selections and popups', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('text-dim on selected'), '4.60');
    assert.equal(ratio('text-dim on popup'), '5.34');
    assert.equal(ratio('text on popup'), '10.58');
    assert.equal(ratio('accent on popup'), '6.54');
  });

  it('passes every terminal colour on the terminal', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    const expected = {
      'terminal-text': '13.58',
      'ansi-red': '3.69',
      'ansi-green': '3.69',
      'ansi-yellow': '3.71',
      'ansi-blue': '3.72',
      'ansi-magenta': '3.73',
      'ansi-cyan': '3.68',
      'ansi-white': '13.58',
      'ansi-bright-black': '6.86',
      'ansi-bright-red': '9.64',
      'ansi-bright-green': '10.19',
      'ansi-bright-yellow': '10.92',
      'ansi-bright-blue': '10.05',
      'ansi-bright-magenta': '9.63',
      'ansi-bright-cyan': '10.44',
      'ansi-bright-white': '15.41'
    };
    const actual = Object.fromEntries(Object.keys(expected).map(name => [ name, ratio(`${name} on terminal`) ]));
    assert.deepEqual(actual, expected);
  });

  it('keeps syntax colours readable on every editor background', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('syntax-comment on editor-selection'), '4.15');
    assert.equal(ratio('syntax-number on editor-selection'), '4.64');
    assert.equal(ratio('syntax-keyword on editor-selection'), '4.63');
    assert.equal(ratio('text-dim on editor-gutter'), '6.86');
    assert.equal(ratio('editor-selection on editor-current-line'), '1.29');
    assert.equal(ratio('editor-current-line on editor'), '1.17');
  });

  it('pairs no foreground with ANSI black', () => {
    const touching = pairs.filter(p => p.foreground === 'ansi-black' || p.background.includes('ansi-black'));
    assert.deepEqual(touching.map(describePair), []);
  });
});
