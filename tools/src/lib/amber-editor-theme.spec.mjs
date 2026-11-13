import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadStyles } from './editor-theme.mjs';
import { PARTS } from './generate.mjs';

const SAMPLES_CSS = fileURLToPath(new URL('../../../prototype/samples.css', import.meta.url));

/** The token the rules `selector { … }` of samples.css read for `property`, as `property: var(--token)`. */
function sampleToken(css, selector, property) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rules = [ ...css.matchAll(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')) ];
  assert.ok(rules.length, `samples.css has no rule ${selector}`);
  const value = rules
    .map(rule => rule[1].match(new RegExp(`(?:^|[\\s;])${property}\\s*:\\s*var\\(--([a-z0-9-]+)\\)`)))
    .find(Boolean);
  assert.ok(value, `${selector} in samples.css reads no token for ${property}`);
  return value[1];
}

describe('Amber.theme', () => {
  const { file, generate } = PARTS['editor-theme'];

  it('is up to date', () => {
    assert.equal(readFileSync(file, 'utf8'), generate(), 'run: node tools/src/bin/generate.mjs editor-theme --write');
  });

  it("uses the sample's tokens", () => {
    const css = readFileSync(SAMPLES_CSS, 'utf8');
    const colours = loadStyles()['editor-colors'];
    const expected = {
      BackgroundColor: sampleToken(css, '.code', 'background'),
      IconBorder: sampleToken(css, '.gutter', 'background'),
      CurrentLine: sampleToken(css, '.current-line', 'background'),
      TextSelection: sampleToken(css, '.text-selection', 'background'),
      SearchHighlight: sampleToken(css, '.search-highlight', 'background'),
      LineNumbers: sampleToken(css, '.gutter', 'color'),
      CurrentLineNumber: sampleToken(css, '.current-line-number', 'color')
    };
    assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key => [ key, colours[key] ])), expected);
    assert.equal(loadStyles()['text-styles'].Normal, sampleToken(css, '.code', 'color'));
  });
});
