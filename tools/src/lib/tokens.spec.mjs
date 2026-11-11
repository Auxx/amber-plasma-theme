import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkPairs,
  describePair,
  formatTokenValue,
  parseOverrides,
  parsePairs,
  parseTokens,
  parseTokenValue,
  resolveToken
} from './tokens.mjs';

const SOURCE = `/* Amber tokens */
:root {
  --tone-0: #151413;
  --tone-2: #25221f; /* main surface */
  --text: #e8e3da;
  --label: var(--text);
  --veil: rgb(0 0 0 / 50%);
  --gap: 1px;
  --haze: color-mix(in srgb, var(--text) 50%, transparent);
}
`;

const pair = (foreground, background, minimum) => ({ foreground, background, minimum, why: '' });

describe('tokens', () => {
  it('parses token values', () => {
    assert.equal(parseTokenValue('#151413').colour.mode, 'rgb');
    assert.deepEqual(parseTokenValue('var( --text )'), { ref: 'text' });
    assert.deepEqual(parseTokenValue('1px'), { length: { value: 1, unit: 'px' } });
    assert.deepEqual(parseTokenValue('color-mix(in srgb,var( --accent ) 28%,transparent)'), { ref: 'accent', alpha: 0.28 });
    assert.throws(() => parseTokenValue('1em'), /Not a colour or a length in px: 1em/);
  });

  it('reads the :root block', () => {
    const tokens = parseTokens(SOURCE);
    assert.equal(tokens.size, 7);
    assert.deepEqual(tokens.get('label'), { ref: 'text' });
  });

  it('refuses what it does not understand', () => {
    assert.throws(() => parseTokens(':root {\n  --gap: 1em;\n}'), /tokens.css:2:/);
    for (const value of [
      'calc(1px + 1px)',
      'color-mix(in oklch, var(--b) 28%, transparent)',
      'color-mix(in srgb, var(--b) 28%, white)',
      'color-mix(in srgb, var(--b) 0%, transparent)',
      'color-mix(in srgb, var(--b) 120%, transparent)',
      '-1px'
    ]) {
      assert.throws(() => parseTokens(`:root {\n  --a: ${value};\n}`), /tokens.css:2:/, value);
    }
    assert.throws(() => parseTokens(':root {\n  color: red;\n}'), /tokens.css:2:/);
    assert.throws(() => parseTokens(':root { --a: #000; }\n.x { --b: #fff; }'), /outside :root/);
    assert.throws(() => parseTokens('--a: #000;'), /no :root/);
    assert.throws(() => parseTokens(':root {\n  --a: #000;\n  --a: #111;\n}'), /tokens.css:3:.*duplicate/i);
  });

  it('resolves references', () => {
    const { colour, chain } = resolveToken(parseTokens(SOURCE), '--label');
    assert.deepEqual(chain, [ 'label', 'text' ]);
    assert.ok(Math.abs(colour.r - 232 / 255) < 1e-9);
  });

  it('resolves part-transparent tokens', () => {
    const tokens = parseTokens(SOURCE);
    const { colour, chain } = resolveToken(tokens, 'haze');
    assert.deepEqual(chain, [ 'haze', 'text' ]);
    assert.equal(colour.alpha, 0.5);
    assert.equal(resolveToken(tokens, 'text').colour.alpha ?? 1, 1);
    const dusk = new Map([ ...tokens, [ 'dusk', { ref: 'veil', alpha: 0.5 } ] ]);
    assert.equal(resolveToken(dusk, 'dusk').colour.alpha, 0.25);
    assert.equal(resolveToken(dusk, 'veil').colour.alpha, 0.5);
  });

  it('refuses a length as a colour', () => {
    const tokens = new Map([ ...parseTokens(SOURCE), [ 'spacing', { ref: 'gap' } ] ]);
    assert.throws(() => resolveToken(tokens, 'gap'), /Not a colour: gap is a length \(1px\)/);
    assert.throws(() => resolveToken(tokens, 'spacing'), /Not a colour: gap is a length \(1px\)/);
    assert.equal(checkPairs(tokens, [ pair('gap', [ 'tone-2' ], 1.3) ])[0].status, 'missing');
  });

  it('formats token values', () => {
    assert.equal(formatTokenValue(parseTokenValue('var(--text)')), 'var(--text)');
    assert.equal(
      formatTokenValue(parseTokenValue('color-mix(in srgb, var(--accent) 28%, transparent)')),
      'color-mix(in srgb, var(--accent) 28%, transparent)'
    );
    assert.equal(formatTokenValue(parseTokenValue('1px')), '1px');
    assert.equal(formatTokenValue(parseTokenValue('#151413')), '#151413');
    assert.equal(formatTokenValue(parseTokenValue('rgb(0 0 0 / 50%)')), '#000000 / 50%');
  });

  it('names unknown tokens and cycles', () => {
    const broken = new Map([ ...parseTokens(SOURCE), [ 'label', { ref: 'nope' } ] ]);
    assert.throws(() => resolveToken(broken, 'label'), /Unknown token: nope \(via label → nope\)/);
    const cycle = new Map([ [ 'a', { ref: 'b' } ], [ 'b', { ref: 'a' } ] ]);
    assert.throws(() => resolveToken(cycle, 'a'), /Token cycle: a → b → a/);
  });

  it('parses overrides', () => {
    const overrides = parseOverrides([ 'text-dim=#a9a297', '--accent=var(--text)' ]);
    assert.deepEqual(overrides.map(o => o.name), [ 'text-dim', 'accent' ]);
    assert.deepEqual(overrides[1].value, { ref: 'text' });
    assert.throws(() => parseOverrides([ 'nope' ]), /Not an override/);
  });

  it('expands pairs', () => {
    const pairs = parsePairs('[{"foreground":"text","on":["tone-0",["tone-0","veil"]],"minimum":4.5,"why":"t"}]');
    assert.equal(pairs.length, 2);
    assert.deepEqual(pairs[1].background, [ 'tone-0', 'veil' ]);
  });

  it('refuses malformed pairs', () => {
    const entry = { foreground: 'text', on: [ 'tone-0' ], minimum: 4.5, why: 't' };
    const bad = [
      { ...entry, minimum: undefined },
      { ...entry, minimum: 30 },
      { ...entry, on: [] },
      { ...entry, on: 'tone-0' },
      { ...entry, why: undefined }
    ];
    for (const value of bad) {
      assert.throws(() => parsePairs(JSON.stringify([ value ])), /entry 1:/, JSON.stringify(value));
    }
  });

  it('checks pairs', () => {
    const tokens = parseTokens(SOURCE);
    const results = checkPairs(tokens, [
      pair('text', [ 'tone-2' ], 4.5),
      pair('text', [ 'tone-2' ], 13),
      pair('text', [ 'nope' ], 4.5),
      pair('text', [ 'veil' ], 4.5)
    ]);
    assert.deepEqual(results.map(r => r.status), [ 'pass', 'fail', 'missing', 'missing' ]);
    assert.match(results[2].error, /Unknown token: nope/);
    assert.match(results[3].error, /not opaque/);
    assert.equal(checkPairs(tokens, [ pair('text', [ 'tone-2' ], 12.2) ])[0].close, true);
  });

  it('describes a pair', () => {
    assert.equal(describePair({ foreground: 'text-dim', background: [ 'tone-2', 'tone-3' ] }), 'text-dim on tone-2 + tone-3');
  });
});
