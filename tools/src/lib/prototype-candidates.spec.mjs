import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkPairs, describePair, loadPairs, loadTokens, parseOverrides } from './tokens.mjs';

/**
 * The candidates in the prototype print their contrast. Each printed ratio is
 * measured again here from the tokens, with the candidate's own `style`
 * overrides, so that a tone changed later cannot leave a stale number on the
 * page.
 */

const PAGE = fileURLToPath(new URL('../../../prototype/index.html', import.meta.url));

const page = readFileSync(PAGE, 'utf8').replace(/<!--[\s\S]*?-->/g, '');

const figures = [ ...page.matchAll(/<figure class="candidate"(?: style="([^"]*)")?>([\s\S]*?)<\/figure>/g) ].map(
  ([ , style = '', body ]) => ({
    caption: body.match(/<figcaption>\s*([^<\n]+?)\s*(?:<|\n)/)?.[1] ?? '(no caption)',
    overrides: style
      .split(';')
      .map(declaration => declaration.trim())
      .filter(Boolean)
      .map(declaration => declaration.replace(/^(--[a-z0-9-]+)\s*:\s*/, '$1=')),
    ratios: [ ...body.matchAll(/<data class="ratio" data-pair="([^"]+)" value="([^"]+)">/g) ].map(([ , pair, value ]) => ({
      pair,
      value
    }))
  })
);

const pairs = new Map(loadPairs().map(pair => [ describePair(pair), pair ]));
const names = new Set(loadTokens().keys());

describe('prototype candidates', () => {
  it('shows the candidates', () => {
    assert.equal(figures.length, 9);
    assert.equal(figures.flatMap(f => f.ratios).length, 18);
  });

  it('names only real pairs and tokens', () => {
    const unknown = figures.flatMap(f => [
      ...f.ratios.filter(r => !pairs.has(r.pair)).map(r => `${f.caption}: no pair ${r.pair}`),
      ...parseOverrides(f.overrides)
        .filter(o => !names.has(o.name))
        .map(o => `${f.caption}: no token ${o.name}`)
    ]);
    assert.deepEqual(unknown, []);
  });

  it('prints every ratio as measured', () => {
    const offences = figures.flatMap(f => {
      const tokens = loadTokens({ overrides: parseOverrides(f.overrides) });
      return f.ratios
        .filter(r => pairs.has(r.pair))
        .map(r => ({ ...r, measured: checkPairs(tokens, [ pairs.get(r.pair) ])[0].ratio?.toFixed(2) }))
        .filter(r => r.measured !== r.value)
        .map(r => `${f.caption}: ${r.pair}: printed ${r.value}, measured ${r.measured}`);
    });
    assert.deepEqual(offences, []);
  });
});
