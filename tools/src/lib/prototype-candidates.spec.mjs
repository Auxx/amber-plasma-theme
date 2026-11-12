import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkPairs, describePair, loadPairs, loadTokens, parseOverrides } from './tokens.mjs';

/**
 * The candidates in the prototype print their contrast. Each printed ratio is
 * measured again here from the tokens, with the candidate's own `style`
 * overrides, so that a tone changed later cannot leave a stale number on the
 * page.
 */

const PROTOTYPE = fileURLToPath(new URL('../../../prototype/', import.meta.url));

const PAGES = readdirSync(PROTOTYPE).filter(name => name.endsWith('.html')).sort();

// Figures and printed ratios on each page. A new page is added here.
const COUNTS = {
  'gallery.html': [ 22, 48 ],
  'index.html': [ 0, 0 ],
  'samples.html': [ 6, 12 ]
};

/** The candidate figures of one page, each with its overrides and ratios. */
function figuresOf(page) {
  const source = readFileSync(join(PROTOTYPE, page), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  return [ ...source.matchAll(/<figure class="candidate"(?: style="([^"]*)")?>([\s\S]*?)<\/figure>/g) ].map(
    ([ , style = '', body ]) => ({
      page,
      caption: `${page}: ${body.match(/<figcaption>\s*([^<\n]+?)\s*(?:<|\n)/)?.[1] ?? '(no caption)'}`,
      overrides: style
        .split(';')
        .map(declaration => declaration.trim())
        .filter(Boolean)
        .map(declaration => declaration.replace(/^(--[a-z0-9-]+)\s*:\s*/, '$1=')),
      ratios: [ ...body.matchAll(/<data class="ratio" data-pair="([^"]+)" value="([^"]+)">([^<]*)<\/data>/g) ].map(
        ([ , pair, value, shown ]) => ({ pair, value, shown })
      )
    })
  );
}

const figures = PAGES.flatMap(figuresOf);

const pairs = new Map(loadPairs().map(pair => [ describePair(pair), pair ]));
const names = new Set(loadTokens().keys());

describe('prototype candidates', () => {
  it('shows the candidates', () => {
    assert.deepEqual(PAGES, Object.keys(COUNTS));
    for (const page of PAGES) {
      const own = figures.filter(f => f.page === page);
      assert.deepEqual([ own.length, own.flatMap(f => f.ratios).length ], COUNTS[page], page);
    }
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

  it('shows each ratio as its value says', () => {
    // `outline on tone-2` with value 1.36 reads "1.36:1 on tone 2".
    const offences = figures.flatMap(f =>
      f.ratios
        .map(r => ({ ...r, expected: `${r.value}:1 ${r.pair.replace(/^\S+ /, '').replaceAll('-', ' ')}` }))
        .filter(r => r.shown.trim() !== r.expected)
        .map(r => `${f.caption}: shows "${r.shown}", value says "${r.expected}"`)
    );
    assert.deepEqual(offences, []);
  });

  it('keeps block markers and well edges at least 3 px', () => {
    // A thinner marker or edge is a hairline: the tokens and every
    // candidate's override are 0 (none) or at least 3 px.
    const NAMES = [ 'marker-width', 'well-edge-width', 'well-focus-edge-width' ];
    const tokens = loadTokens();
    const offences = NAMES.map(name => [ `tokens.css: ${name}`, tokens.get(name)?.length?.value ]).concat(
      figures.flatMap(f =>
        parseOverrides(f.overrides)
          .filter(o => NAMES.includes(o.name))
          .map(o => [ `${f.caption}: ${o.name}`, o.value.length?.value ])
      )
    )
      .filter(([ , px ]) => !(px === 0 || px >= 3))
      .map(([ where, px ]) => `${where} is ${px} px`);
    assert.deepEqual(offences, []);
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
