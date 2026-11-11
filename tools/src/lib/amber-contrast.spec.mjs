import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkPairs, describePair, loadPairs, loadTokens } from './tokens.mjs';

/**
 * Amber's contrast pairs, measured from prototype/tokens.css and
 * prototype/contrast-pairs.json, so that a token change that breaks a pair
 * fails the tests (docs/architecture/accessibility.md).
 */

// Colour tokens that need no pair: the shadow shows no state (D-4). Every
// other colour token carries text, marks state or lies under text, and must be
// the foreground or a background layer of at least one pair
// (docs/architecture/accessibility.md, "How the check works").
const NO_PAIR = [ 'shadow' ];

describe('Amber contrast pairs', () => {
  const tokens = loadTokens();
  const pairs = loadPairs();
  const results = checkPairs(tokens, pairs);

  it('finds the pairs', () => {
    assert.equal(pairs.length, 37);
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

  it('starts the window outline and glow where O-4 starts', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('outline on tone-2'), '1.36');
    assert.equal(ratio('glow on tone-2'), '1.82');
  });

  it('starts the focused tones where O-3 starts', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('raised-focus on tone-3'), '2.07');
    assert.equal(ratio('well-focus on tone-0'), '1.45');
    assert.equal(ratio('text-dim on well-focus'), '5.01');
  });

  it('starts the well where O-1 starts', () => {
    const ratio = description => results.find(r => describePair(r.pair) === description).ratio.toFixed(2);
    assert.equal(ratio('well on tone-2'), '1.16');
    assert.equal(ratio('well-edge on tone-2'), '1.16');
  });
});
