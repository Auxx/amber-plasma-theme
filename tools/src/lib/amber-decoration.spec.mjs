import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { srgb8 } from './colour.mjs';
import { BUTTON_STATES, FADE, GLYPHS } from './decoration.mjs';
import { PARTS } from './generate.mjs';
import { loadTokens, resolveToken } from './tokens.mjs';

const WINDOW_CSS = fileURLToPath(new URL('../../../prototype/window.css', import.meta.url));
const GALLERY = fileURLToPath(new URL('../../../prototype/gallery.html', import.meta.url));

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
    /** The fills of the rects of one element (a group). */
    const fills = id => [ ...svg.match(new RegExp(`<g id="${id}">([\\s\\S]*?)</g>`))[1].matchAll(/fill="([^"]+)"/g) ].map(m => m[1]);
    const titleBar = hexOf(windowToken('.title-bar', 'background'));
    const outline = hexOf(windowToken('.window', 'outline'));
    for (const prefix of [ 'decoration', 'decoration-inactive' ]) {
      assert.deepEqual(fills(`${prefix}-center`), [ titleBar ], `${prefix}-center`);
      assert.ok(fills(`${prefix}-top`).includes(outline), `${prefix}-top`);
      assert.ok(fills(`${prefix}-bottomright`).includes(outline), `${prefix}-bottomright`);
    }
    // The light of each state is the prototype's: --light of .window.is-active and of an inactive window (P5.3).
    const stopColour = id => svg.match(new RegExp(`<linearGradient id="${id}"[^>]*><stop [^>]*stop-color="(#[0-9a-f]{6})"`))[1];
    assert.equal(stopColour('active-top'), hexOf(windowToken('.window.is-active', '--light')));
    assert.equal(stopColour('inactive-top'), hexOf(windowToken('.window:not(.is-active),\n.popup', '--light')));
  });


  it('generates every window button', () => {
    assert.deepEqual(Object.keys(generate()).sort(),
      [ 'amberrc', 'close.svg', 'decoration.svg', 'maximize.svg', 'minimize.svg', 'restore.svg' ]);
  });

  it("matches the prototype's window buttons", () => {
    // The tokens window.css gives each state; at rest a button shows the title bar.
    const titleBar = windowToken('.title-bar', 'background');
    const text = windowToken('.window-button', 'color');
    const dim = windowToken('.window-button.is-inactive', 'color');
    const hovered = windowToken('.window-button:not(.is-close).is-hovered', 'background');
    const pressed = windowToken('.window-button:not(.is-close).is-pressed', 'background');
    const danger = windowToken('.window-button.is-close.is-pressed', 'background');
    const onDanger = windowToken('.window-button.is-close.is-pressed', 'color');
    const expected = {
      active: [ titleBar, text, titleBar, text ],
      hover: [ hovered, text, danger, onDanger ],
      pressed: [ pressed, text, danger, onDanger ],
      inactive: [ titleBar, dim, titleBar, dim ],
      'hover-inactive': [ hovered, dim, danger, onDanger ],
      'pressed-inactive': [ pressed, dim, danger, onDanger ]
    };
    for (const { prefix, fill, glyph } of BUTTON_STATES) {
      assert.deepEqual([ fill.plain, glyph.plain, fill.close, glyph.close ], expected[prefix], prefix);
    }
  });

  it("draws the prototype's glyphs at its size", () => {
    const css = readFileSync(WINDOW_CSS, 'utf8');
    const svgRule = css.match(/\n\.window-button svg \{([^}]*)\}/)[1];
    assert.match(svgRule, /width: 16px;/);
    assert.match(svgRule, /stroke-width: 1\.5;/);
    const svg = generate()['close.svg'];
    assert.match(svg, /stroke-width="1\.5"/);
    assert.match(svg, /translate\(7 7\)/);
    const gallery = Object.fromEntries([ ...readFileSync(GALLERY, 'utf8')
      .matchAll(/class="window-button is-(\w+)[^"]*"[^>]*><svg[^>]*><path d="([^"]+)"/g) ].map(([ , name, d ]) => [ name, d ]));
    const names = { minimize: 'minimise', maximize: 'maximise', restore: 'restore', close: 'close' };
    for (const [ button, name ] of Object.entries(names)) {
      assert.equal(GLYPHS[button], gallery[name], button);
    }
  });

  it("fades on the prototype's curve (P5.3)", () => {
    const css = readFileSync(WINDOW_CSS, 'utf8');
    const body = css.match(/--light-fade:([^;]*);/)[1];
    const share = percent => Math.round(Number(percent) * 10) / 1000;
    const stops = body.split(/,\s*\n/).map(s => s.trim()).filter(Boolean).map(stop => {
      if (stop === 'transparent') {
        return [ 1, 0 ];
      }
      const full = stop.match(/^var\(--light\) ([\d.]+)%$/);
      if (full) {
        return [ share(full[1]), 1 ];
      }
      const mixed = stop.match(/^color-mix\(in srgb, var\(--light\) ([\d.]+)%, transparent\) ([\d.]+)%$/);
      assert.ok(mixed, `window.css: a stop of --light-fade not understood: ${stop}`);
      return [ share(mixed[2]), share(mixed[1]) ];
    });
    assert.deepEqual(FADE, stops);
  });

  it('shifts the glow by the tokens the prototype reads (P5.3)', () => {
    for (const side of [ 'top', 'side', 'bottom' ]) {
      assert.equal(windowToken('.window.is-active', `--light-inset-${side}`), `glow-inset-${side}`);
      assert.equal(windowToken('.window:not(.is-active),\n.popup', `--light-inset-${side}`), `shadow-inset-${side}`);
    }
  });
});
