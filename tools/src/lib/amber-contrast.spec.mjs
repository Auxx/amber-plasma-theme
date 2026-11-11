import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkPairs, describePair, loadPairs, loadTokens } from './tokens.mjs';

/**
 * Amber's contrast pairs, measured from prototype/tokens.css and
 * prototype/contrast-pairs.json, so that a token change that breaks a pair
 * fails the tests (docs/architecture/accessibility.md).
 */

// Colour tokens that need no pair: the tones and danger are only ever a
// background, and the shadow shows no state (D-4). Every other colour token
// carries text or marks state, and must be the foreground of at least one pair
// (docs/architecture/accessibility.md, "How the check works").
const NO_PAIR = [ 'tone-0', 'tone-1', 'tone-2', 'tone-3', 'tone-4', 'danger', 'shadow' ];

describe('Amber contrast pairs', () => {
  const tokens = loadTokens();
  const pairs = loadPairs();
  const results = checkPairs(tokens, pairs);

  it('finds the pairs', () => {
    assert.equal(pairs.length, 23);
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

  it('gives every foreground token a pair', () => {
    const foregrounds = new Set(pairs.map(p => p.foreground));
    const unpaired = [ ...tokens ]
      .filter(([ name, value ]) => !value.length && !NO_PAIR.includes(name) && !foregrounds.has(name))
      .map(([ name ]) => name);
    assert.deepEqual(unpaired, []);
  });

  it('settles dim text on tone 4', () => {
    const result = results.find(r => describePair(r.pair) === 'text-dim on tone-4');
    assert.equal(result.ratio.toFixed(2), '4.60');
    assert.equal(result.close, false);
  });

  it('starts the window outline and glow where O-4 starts', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('outline on tone-2'), '1.36');
    assert.equal(ratio('glow on tone-2'), '1.82');
  });
});
