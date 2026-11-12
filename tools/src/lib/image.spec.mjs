import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { srgb8 } from './colour.mjs';
import { colourCounts, coolGreys, markPixels } from './image.mjs';
import { loadTokens, resolveToken } from './tokens.mjs';

const tokens = loadTokens();
const rgba = name => {
  const { r, g, b } = srgb8(resolveToken(tokens, name).colour);
  return [ r, g, b, 255 ];
};
const hex = text => [ 1, 3, 5, 7 ].map(i => (i < text.length ? parseInt(text.slice(i, i + 2), 16) : 255));

/** A picture one row high, from a list of RGBA pixels, plus extra rows given by position. */
function picture(row, extra = []) {
  const height = 1 + Math.max(0, ...extra.map(p => p.y));
  const pixels = new Uint8Array(row.length * height * 4);
  for (let y = 0; y < height; y++) {
    row.forEach((p, x) => pixels.set(p, (y * row.length + x) * 4));
  }
  for (const { x, y, colour } of extra) {
    pixels.set(colour, (y * row.length + x) * 4);
  }
  return { width: row.length, height, pixels };
}

/** `text` over `tone-2` at 20 opacities, as anti-aliased text is drawn. */
function textMixes() {
  const [ fr, fg, fb ] = rgba('text');
  const [ br, bg, bb ] = rgba('tone-2');
  return Array.from({ length: 20 }, (_, i) => {
    const a = (i + 1) / 21;
    return [ fr * a + br * (1 - a), fg * a + bg * (1 - a), fb * a + bb * (1 - a), 255 ].map(Math.round);
  });
}

const warm = [ rgba('tone-0'), rgba('tone-2'), rgba('text'), rgba('accent'), ...textMixes() ];

describe('coolGreys', () => {
  it('reports nothing in a picture of warm tokens and their anti-aliased mixes', () => {
    assert.deepEqual(coolGreys(picture(warm)), []);
  });

  it('reports a neutral grey and a cool grey, most pixels first', () => {
    const row = [ ...warm, hex('#808080'), hex('#808080'), hex('#808080'), hex('#2b2d31'), hex('#2b2d31') ];
    const found = coolGreys(picture(row));
    assert.deepEqual(found.map(f => [ f.hex, f.count ]), [ [ '#808080', 3 ], [ '#2b2d31', 2 ] ]);
    assert.deepEqual(found[0].box, { x: warm.length, y: 0, width: 3, height: 1 });
    assert.deepEqual(found[1].box, { x: warm.length + 3, y: 0, width: 2, height: 1 });
    assert.ok(found.every(f => f.why.startsWith('not warm')));
  });

  it('reports a near-black that leans cool, which tone 0 is beside', () => {
    // #141415 is OKLCH chroma 0.002 at hue 286; tone 0 is 0.003 at hue 68.
    assert.deepEqual(coolGreys(picture([ rgba('tone-0'), hex('#141415') ])).map(f => f.hex), [ '#141415' ]);
  });

  it('does not report black or a hue', () => {
    assert.deepEqual(coolGreys(picture([ hex('#000000'), hex('#487a97') ])), []);
  });

  it('looks only inside the region', () => {
    const image = picture([ rgba('tone-2'), rgba('tone-2') ], [ { x: 1, y: 1, colour: hex('#808080') } ]);
    assert.equal(coolGreys(image).length, 1);
    assert.deepEqual(coolGreys(image, { region: { x: 0, y: 0, width: 2, height: 1 } }), []);
  });

  it('skips a fully transparent pixel', () => {
    assert.deepEqual(coolGreys(picture([ hex('#80808000') ])), []);
  });
});

describe('colourCounts', () => {
  it('names a colour that is a token, and leaves another unnamed', () => {
    const counts = colourCounts(picture([ hex('#151413'), hex('#151413'), hex('#123456') ]), { tokens });
    assert.deepEqual(counts, [ { hex: '#151413', count: 2, token: 'tone-0' }, { hex: '#123456', count: 1 } ]);
  });

  it('counts only inside the region', () => {
    const counts = colourCounts(picture([ hex('#151413'), hex('#123456') ]), { region: { x: 1, y: 0, width: 1, height: 1 } });
    assert.deepEqual(counts, [ { hex: '#123456', count: 1 } ]);
  });
});

describe('markPixels', () => {
  it('paints only the listed colours magenta', () => {
    const image = picture([ hex('#808080'), hex('#151413') ]);
    const marked = markPixels(image, [ '#808080' ]);
    assert.deepEqual([ ...marked.pixels ], [ 255, 0, 255, 255, 0x15, 0x14, 0x13, 255 ]);
    assert.deepEqual([ ...image.pixels.slice(0, 4) ], [ 128, 128, 128, 255 ], 'the original is unchanged');
  });
});
