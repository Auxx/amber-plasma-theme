import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { srgb8 } from './colour.mjs';
import { PARTS } from './generate.mjs';
import { loadTokens, resolveToken } from './tokens.mjs';

const WINDOW_CSS = fileURLToPath(new URL('../../../prototype/window.css', import.meta.url));

/** The token that the first rule `selector { … }` of window.css reads in `property: … var(--token)`. */
function windowToken(selector, property) {
  const css = readFileSync(WINDOW_CSS, 'utf8');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(rule, `window.css has no rule ${selector}`);
  const values = [ ...rule[1].matchAll(new RegExp(`(?:^|[\\s;])${property}\\s*:([^;]*);`, 'g')) ].map(m => m[1]);
  const token = values.map(v => v.match(/var\(--([a-z0-9-]+)\)\s*$/)).find(Boolean);
  assert.ok(token, `${selector} in window.css reads no token for ${property}`);
  return token[1];
}

const tokens = loadTokens();
const hexOf = name => {
  const { r, g, b } = srgb8(resolveToken(tokens, name).colour);
  return `#${[ r, g, b ].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

describe('Amber decoration', () => {
  const { folder, generate } = PARTS.decoration;

  it('the decoration is up to date', () => {
    for (const [ name, content ] of Object.entries(generate())) {
      assert.equal(readFileSync(join(folder, name), 'utf8'), content,
        `parts/decoration/amber/${name} is stale; run: node tools/src/bin/generate.mjs decoration --write`);
    }
  });

  it('names the theme amber', () => {
    const metadata = readFileSync(join(folder, 'metadata.desktop'), 'utf8');
    assert.match(metadata, /^Name=Amber$/m);
    assert.match(metadata, /^X-KDE-PluginInfo-Name=amber$/m);
  });

  it("matches the prototype's window", () => {
    const svg = generate()['decoration.svg'];
    const fill = id => svg.match(new RegExp(`id="${id}"[^>]*fill="(#[0-9a-f]{6})"`))[1];
    const titleBar = hexOf(windowToken('.title-bar', 'background'));
    const outline = hexOf(windowToken('.window', 'outline'));
    for (const prefix of [ 'decoration', 'decoration-inactive' ]) {
      assert.equal(fill(`${prefix}-center`), titleBar, `${prefix}-center`);
      assert.equal(fill(`${prefix}-top`), outline, `${prefix}-top`);
      assert.equal(fill(`${prefix}-bottomright`), outline, `${prefix}-bottomright`);
    }
  });
});
