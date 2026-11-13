import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { srgb8 } from './colour.mjs';
import { PARTS } from './generate.mjs';
import { loadKeys } from './terminal-colours.mjs';
import { loadTokens, resolveToken } from './tokens.mjs';

const SAMPLES_CSS = fileURLToPath(new URL('../../../prototype/samples.css', import.meta.url));
const NAMES = [ 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white' ];

/** The token a rule of samples.css reads for `property`, as `selector { property: var(--token); }`. */
function sampleToken(css, selector, property) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(rule, `samples.css has no rule ${selector}`);
  const value = rule[1].match(new RegExp(`(?:^|[\\s;])${property}\\s*:\\s*var\\(--([a-z0-9-]+)\\)`));
  assert.ok(value, `${selector} in samples.css reads no token for ${property}`);
  return value[1];
}

describe('Amber.colorscheme', () => {
  const { file, generate } = PARTS['terminal-colours'];

  it('is up to date', () => {
    assert.equal(readFileSync(file, 'utf8'), generate(), 'run: node tools/src/bin/generate.mjs terminal-colours --write');
  });

  it('holds only token colours', () => {
    const tokens = loadTokens();
    const colours = new Set();
    for (const name of tokens.keys()) {
      try {
        const { r, g, b, alpha } = srgb8(resolveToken(tokens, name).colour);
        if (alpha === 1) {
          colours.add(`${r},${g},${b}`);
        }
      } catch {
        // a length, not a colour
      }
    }
    const values = readFileSync(file, 'utf8').split('\n').filter(line => line.startsWith('Color=')).map(line => line.slice(6));
    assert.equal(values.length, 30);
    assert.deepEqual(values.filter(value => !colours.has(value)), []);
  });

  it("uses the sample's tokens for each ANSI colour", () => {
    const css = readFileSync(SAMPLES_CSS, 'utf8');
    const keys = loadKeys();
    NAMES.forEach((name, n) => {
      assert.equal(keys[`Color${n}`], sampleToken(css, `.ansi-${name}`, 'color'), `Color${n}`);
      assert.equal(keys[`Color${n}Intense`], sampleToken(css, `.ansi-bright-${name}`, 'color'), `Color${n}Intense`);
    });
    assert.equal(keys.Background, sampleToken(css, '.terminal', 'background'));
    assert.equal(keys.Foreground, sampleToken(css, '.terminal', 'color'));
  });
});
