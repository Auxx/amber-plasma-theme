import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkPairs, describePair, loadPairs, loadTokens } from './tokens.mjs';

/**
 * Amber's contrast pairs, measured from prototype/tokens.css and
 * prototype/contrast-pairs.json, so that a token change that breaks a pair
 * fails the tests (docs/architecture/accessibility.md).
 */

// Tokens that are only ever a background. Every other token carries text or
// marks state, and must be the foreground of at least one pair
// (docs/architecture/accessibility.md, "How the check works").
const BACKGROUND_ONLY = [ 'tone-0', 'tone-1', 'tone-2', 'tone-3', 'tone-4', 'danger' ];

describe('Amber contrast pairs', () => {
  const tokens = loadTokens();
  const pairs = loadPairs();
  const results = checkPairs(tokens, pairs);

  it('finds the pairs', () => {
    assert.equal(pairs.length, 17);
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
    const unpaired = [ ...tokens.keys() ].filter(name => !BACKGROUND_ONLY.includes(name) && !foregrounds.has(name));
    assert.deepEqual(unpaired, []);
  });

  it('settles dim text on tone 4', () => {
    const result = results.find(r => describePair(r.pair) === 'text-dim on tone-4');
    assert.equal(result.ratio.toFixed(2), '4.60');
    assert.equal(result.close, false);
  });
});
