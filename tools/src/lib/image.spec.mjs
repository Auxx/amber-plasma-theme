import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { srgb8 } from './colour.mjs';
import { colourCounts, coolGreys, fill, frame, lightAlphas, lines, markPixels, profile, tokenNames } from './image.mjs';
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
    // #131416 leans blue by more than rounding explains; tone 0 is chroma 0.003 at hue 68.
    assert.deepEqual(coolGreys(picture([ rgba('tone-0'), hex('#131416') ])).map(f => f.hex), [ '#131416' ]);
  });

  it('does not report a pixel that 8-bit rounding of warm colours explains', () => {
    // A 1 px border of tone 0 drawn at scale 1.49 over tone 2 gave #161515: between
    // the two on every channel, but at hue 20 once rounded. #161514 is warm.
    assert.deepEqual(coolGreys(picture([ hex('#161515') ])), []);
  });

  it('still reports a grey with no hue at all, which no rounding explains', () => {
    assert.deepEqual(coolGreys(picture([ hex('#5d5d5d') ])).map(f => f.hex), [ '#5d5d5d' ]);
  });

  it('does not report black or a hue', () => {
    assert.deepEqual(coolGreys(picture([ hex('#000000'), hex('#487a97') ])), []);
  });

  it('looks only inside the region', () => {
    const image = picture([ rgba('tone-2'), rgba('tone-2') ], [ { x: 1, y: 1, colour: hex('#808080') } ]);
    assert.equal(coolGreys(image).length, 1);
    assert.deepEqual(coolGreys(image, { region: { x: 0, y: 0, width: 2, height: 1 } }), []);
  });

  it('skips the regions it is told to leave out, inside the region (P3.9)', () => {
    const image = picture([ hex('#808080'), rgba('tone-2'), hex('#5d5d5d') ], [ { x: 2, y: 1, colour: hex('#2b2d31') } ]);
    const leaveOut = [ { x: 0, y: 0, width: 1, height: 2 }, { x: 2, y: 1, width: 1, height: 1 } ];
    assert.deepEqual(coolGreys(image, { leaveOut }).map(f => f.hex), [ '#5d5d5d' ]);
    assert.deepEqual(coolGreys(image, { region: { x: 0, y: 0, width: 2, height: 2 }, leaveOut }), []);
  });

  it('leaves out a region that reaches past the picture, up to its edge (P3.9)', () => {
    const image = picture([ rgba('tone-2'), hex('#808080') ]);
    assert.deepEqual(coolGreys(image, { leaveOut: [ { x: 1, y: 0, width: 50, height: 50 } ] }), []);
  });

  it('skips a fully transparent pixel', () => {
    assert.deepEqual(coolGreys(picture([ hex('#80808000') ])), []);
  });

  it('skips a blend of two of the given colours, as anti-aliased blue text is (P4.1)', () => {
    // ANSI blue over the terminal at 40 %: a hue mixed down to a cool grey.
    const [ fr, fg, fb ] = rgba('ansi-blue');
    const [ br, bg, bb ] = rgba('terminal');
    const blend = [ fr * 0.4 + br * 0.6, fg * 0.4 + bg * 0.6, fb * 0.4 + bb * 0.6, 255 ].map(Math.round);
    const image = picture([ rgba('terminal'), blend ]);
    assert.equal(coolGreys(image).length, 1);
    assert.deepEqual(coolGreys(image, { blendsOf: [ rgba('ansi-blue'), rgba('terminal') ] }), []);
  });

  it('still reports a grey that fills an area, though it lies on a blend line (P4.1 review)', () => {
    // Breeze's #1f2121 lies within 2 of the line from the terminal to ANSI blue,
    // but a pane header filled with it is an area, not the edge of a stroke.
    const ends = [ rgba('ansi-blue'), rgba('terminal') ];
    const grey = hex('#1f2121');
    const row = [ rgba('terminal'), grey, grey, grey, rgba('ansi-blue') ];
    const image = picture(row, [ 1, 2, 3 ].flatMap(x => [ 1, 2 ].map(y => ({ x, y, colour: grey }))));
    assert.deepEqual(coolGreys(image, { blendsOf: ends }).map(f => f.hex), [ '#1f2121' ]);
  });

  it('still reports a grey that is no blend of the given colours (P4.1)', () => {
    const image = picture([ hex('#808080'), hex('#2b2d31') ]);
    const found = coolGreys(image, { blendsOf: [ rgba('ansi-blue'), rgba('terminal'), rgba('text') ] });
    assert.deepEqual(found.map(f => f.hex), [ '#2b2d31', '#808080' ]);
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

describe('profile', () => {
  const strip = picture([ '#000000', '#585248', '#151413', '#151413', '#151413', '#25221f' ].map(hex));
  /** The same six pixels as one column. */
  const column = { width: 1, height: 6, pixels: strip.pixels };

  it('reads a row as runs, named as tokens (P5.1)', () => {
    const runs = profile(strip, { x: 0, y: 0 }, { x: 5, y: 0 }, tokenNames(tokens));
    assert.deepEqual(runs.map(r => r.length), [ 1, 1, 3, 1 ]);
    assert.equal(runs[1].colour, '#585248');
    assert.equal(runs[1].token, 'outline');
    assert.deepEqual(runs[2].at, { x: 2, y: 0 });
  });

  it('reads a column upwards, each run at its first pixel in that order (P5.1)', () => {
    const runs = profile(column, { x: 0, y: 5 }, { x: 0, y: 0 });
    assert.deepEqual(runs.map(r => r.colour), [ '#25221f', '#151413', '#585248', '#000000' ]);
    assert.deepEqual(runs.map(r => r.at.y), [ 5, 4, 1, 0 ]);
    assert.equal(runs[0].token, undefined);
  });

  it('refuses a diagonal (P5.1)', () => {
    assert.throws(() => profile(column, { x: 0, y: 0 }, { x: 1, y: 1 }), /same row or column/);
  });

  it('refuses a point outside the picture (P5.1)', () => {
    assert.throws(() => profile(strip, { x: 0, y: 0 }, { x: 6, y: 0 }), /outside the picture/);
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

describe('frame', () => {
  const SURFACE = '#25221f';
  const FILL = '#312e29';
  const BORDER = '#3c3832';
  const ACCENT = '#d1b072';

  /** A blank canvas of `fill` (or transparent with `null`), with helpers to paint on it. */
  function canvas(width, height, fill = SURFACE) {
    const pixels = new Uint8Array(width * height * 4);
    const set = (x, y, colour) => pixels.set(colour === null ? [ 0, 0, 0, 0 ] : hex(colour), (y * width + x) * 4);
    const rect = (x0, y0, w, h, colour) => {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          set(x, y, colour);
        }
      }
    };
    rect(0, 0, width, height, fill);
    return { image: { width, height, pixels }, set, rect };
  }

  /** A rectangle with corners cut by a circle of radius `r`, by pixel centres. */
  function rounded(c, x0, y0, w, h, r, colour) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const cx = Math.min(Math.max(x + 0.5, x0 + r), x0 + w - r);
        const cy = Math.min(Math.max(y + 0.5, y0 + r), y0 + h - r);
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) {
          c.set(x, y, colour);
        }
      }
    }
  }

  const all = value => ({ tl: value, tr: value, bl: value, br: value });
  const sides = value => ({ top: value, right: value, bottom: value, left: value });

  it('finds a plain rectangle square and clear', () => {
    const c = canvas(60, 40);
    c.rect(10, 10, 40, 20, FILL);
    const result = frame(c.image, { surface: SURFACE });
    assert.equal(result.drawn, true);
    assert.deepEqual(result.box, { x: 10, y: 10, width: 40, height: 20 });
    assert.deepEqual(result.corners, all('square'));
    assert.deepEqual(result.sides, sides('clear'));
  });

  it('finds a 1 px border as a line on every side', () => {
    const c = canvas(60, 40);
    c.rect(10, 10, 40, 20, BORDER);
    c.rect(11, 11, 38, 18, FILL);
    const result = frame(c.image, { surface: SURFACE });
    assert.deepEqual(result.sides, sides('line'));
    assert.deepEqual(result.lines.top, { hex: BORDER, thickness: 1 });
    assert.deepEqual(result.corners, all('square'));
  });

  it('finds a 2 px border as a line two pixels thick', () => {
    const c = canvas(60, 40);
    c.rect(10, 10, 40, 20, BORDER);
    c.rect(12, 12, 36, 16, FILL);
    const result = frame(c.image, { surface: SURFACE });
    assert.deepEqual(result.sides, sides('line'));
    assert.deepEqual(result.lines.left, { hex: BORDER, thickness: 2 });
  });

  it('takes a bar 3 px high at the foot as a band, not a line', () => {
    const c = canvas(60, 40);
    c.rect(10, 10, 40, 20, FILL);
    c.rect(10, 27, 40, 3, ACCENT);
    const result = frame(c.image, { surface: SURFACE });
    assert.deepEqual(result.sides, sides('clear'));
    assert.deepEqual(result.corners, all('square'));
  });

  it('finds the corners of a focus bar square on magenta, though accent is nearer magenta than the fill is (P3.4)', () => {
    const c = canvas(60, 40, '#ff00ff');
    c.rect(10, 10, 40, 20, '#1c1a18');
    c.rect(10, 27, 40, 3, ACCENT);
    const result = frame(c.image, { surface: '#ff00ff' });
    assert.deepEqual(result.corners, all('square'));
    assert.deepEqual(result.sides, sides('clear'));
  });

  it('still finds the corners of a focus bar rounded when they are cut (P3.4)', () => {
    const c = canvas(60, 40, '#ff00ff');
    rounded(c, 10, 10, 40, 20, 5, '#1c1a18');
    for (let x = 12; x < 48; x++) {
      for (let y = 27; y < 30; y++) {
        c.set(x, y, ACCENT);
      }
    }
    const result = frame(c.image, { surface: '#ff00ff' });
    assert.equal(result.corners.bl, 'rounded');
    assert.equal(result.corners.br, 'rounded');
  });

  it('finds corners cut by a radius of 5 rounded', () => {
    const c = canvas(60, 40);
    rounded(c, 10, 10, 40, 20, 5, FILL);
    assert.deepEqual(frame(c.image, { surface: SURFACE }).corners, all('rounded'));
  });

  it('finds the ends of a thumb with a radius of 10 rounded', () => {
    const c = canvas(50, 40);
    rounded(c, 10, 10, 30, 20, 10, FILL);
    assert.deepEqual(frame(c.image, { surface: SURFACE }).corners, all('rounded'));
  });

  it('finds a 16 px circle rounded, as a round widget is', () => {
    const c = canvas(30, 30);
    rounded(c, 7, 7, 16, 16, 8, FILL);
    const result = frame(c.image, { surface: SURFACE });
    assert.deepEqual(result.corners, all('rounded'));
    assert.deepEqual(result.sides, sides('clear'));
  });

  it('judges nothing where scattered pixels, like text, fill no side', () => {
    const c = canvas(60, 40);
    for (const [ x, y ] of [ [ 10, 10 ], [ 14, 12 ], [ 20, 10 ], [ 26, 15 ], [ 33, 11 ], [ 40, 18 ], [ 12, 18 ], [ 30, 18 ] ]) {
      c.set(x, y, '#e8e3da');
    }
    const result = frame(c.image, { surface: SURFACE });
    assert.equal(result.drawn, true);
    assert.deepEqual(result.corners, all('not judged'));
    assert.deepEqual(result.sides, sides('not judged'));
  });

  it('judges nothing in text whose strokes reach the edge of its box', () => {
    // "Tl": a crossbar along the top and a stem down the right side, as the
    // glyphs of a text field's text drawn on its own surface.
    const c = canvas(60, 40);
    c.rect(10, 10, 9, 1, '#e8e3da');
    c.rect(14, 10, 1, 11, '#e8e3da');
    c.rect(24, 10, 1, 11, '#e8e3da');
    const result = frame(c.image, { surface: SURFACE });
    assert.deepEqual(result.corners, all('not judged'));
    assert.deepEqual(result.sides, sides('not judged'));
  });

  it('finds a separator one pixel wide, drawn alone, a line', () => {
    const c = canvas(20, 40);
    c.rect(10, 10, 1, 20, BORDER);
    const result = frame(c.image, { surface: SURFACE });
    assert.equal(result.sides.left, 'line');
    assert.equal(result.sides.right, 'line');
    assert.deepEqual(result.lines.left, { hex: BORDER, thickness: 1 });
  });

  it('finds a separator two pixels high, drawn alone, a line', () => {
    const c = canvas(40, 20);
    c.rect(5, 10, 30, 2, BORDER);
    const result = frame(c.image, { surface: SURFACE });
    assert.equal(result.sides.top, 'line');
    assert.equal(result.sides.bottom, 'line');
    assert.deepEqual(result.lines.top, { hex: BORDER, thickness: 2 });
  });

  it('reports nothing drawn on a bare surface', () => {
    const result = frame(canvas(20, 20).image, { surface: SURFACE });
    assert.equal(result.drawn, false);
    assert.equal(result.box, null);
    assert.deepEqual(result.corners, all('not judged'));
    assert.deepEqual(result.sides, sides('not judged'));
  });

  it('counts a transparent pixel as surface', () => {
    const c = canvas(60, 40, null);
    c.rect(10, 10, 40, 20, FILL);
    const result = frame(c.image, { surface: SURFACE });
    assert.deepEqual(result.box, { x: 10, y: 10, width: 40, height: 20 });
    assert.deepEqual(result.corners, all('square'));
    assert.deepEqual(result.sides, sides('clear'));
  });

  it('looks only inside a region', () => {
    const c = canvas(120, 40);
    c.rect(10, 10, 40, 20, FILL);
    rounded(c, 70, 10, 40, 20, 5, FILL);
    const result = frame(c.image, { surface: SURFACE, region: { x: 0, y: 0, width: 60, height: 40 } });
    assert.deepEqual(result.corners, all('square'));
  });
});

/** A width × height picture of one colour, with rectangles painted over it: [x, y, w, h, '#rrggbb']. */
function canvas(width, height, colour, rects = []) {
  const pixels = new Uint8Array(width * height * 4);
  const paint = (x0, y0, w, h, c) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        pixels.set(hex(c), (y * width + x) * 4);
      }
    }
  };
  paint(0, 0, width, height, colour);
  for (const r of rects) {
    paint(...r);
  }
  return { width, height, pixels };
}

describe('fill', () => {
  it('finds the fill and the text of a button whose blended edges outnumber the strokes', () => {
    // Three strokes 2 px wide and 12 px tall, each edged by 2 px of a half blend on both sides.
    const rects = [];
    for (const x of [ 10, 26, 42 ]) {
      rects.push([ x - 2, 9, 2, 12, '#8d8981' ], [ x, 9, 2, 12, '#e8e3da' ], [ x + 2, 9, 2, 12, '#8d8981' ]);
    }
    assert.deepEqual(fill(canvas(60, 30, '#312e29', rects)), { background: '#312e29', text: '#e8e3da' });
  });

  it('finds no text on a plain fill', () => {
    assert.deepEqual(fill(canvas(40, 20, '#3c3832')), { background: '#3c3832', text: null });
  });

  it('leaves the surface out', () => {
    const image = canvas(60, 40, '#ff00ff', [ [ 10, 10, 40, 20, '#312e29' ] ]);
    assert.deepEqual(fill(image, { surface: '#ff00ff' }), { background: '#312e29', text: null });
  });

  it('takes the text, not the fill, when text covers a quarter of the widget', () => {
    const image = canvas(40, 30, '#695c45', [ [ 0, 0, 40, 7, '#e8e3da' ], [ 0, 10, 10, 2, '#e8e3da' ] ]);
    assert.deepEqual(fill(image), { background: '#695c45', text: '#e8e3da' });
  });

  it('finds text whose full colour is only a few pixels among many blends, as small text at scale 1 is', () => {
    const rects = [ [ 0, 0, 3, 1, '#e8e3da' ] ];
    [ '#b8b3ac', '#817e77', '#514d48', '#9e9a93', '#c4bfb6', '#aaa69e' ].forEach((c, i) => rects.push([ 0, 2 + i, 10, 1, c ]));
    assert.deepEqual(fill(canvas(100, 40, '#312e29', rects)), { background: '#312e29', text: '#e8e3da' });
  });

  it('finds the text of a dark label on a light fill', () => {
    const image = canvas(60, 30, '#d1b072', [ [ 10, 10, 2, 1, '#1b160b' ], [ 12, 10, 10, 1, '#76633f' ] ]);
    assert.equal(fill(image).text, '#1b160b');
  });

  it('leaves the foot out of the fill and the text, and gives its colour (P3.4)', () => {
    const rects = [ [ 0, 27, 60, 3, '#d1b072' ] ];
    for (const x of [ 10, 26, 42 ]) {
      rects.push([ x, 9, 2, 12, '#a9a297' ]);
    }
    const image = canvas(60, 30, '#1c1a18', rects);
    assert.deepEqual(fill(image, { foot: 3 }), { background: '#1c1a18', text: '#a9a297', foot: '#d1b072' });
    assert.deepEqual(fill(image), { background: '#1c1a18', text: '#d1b072' });
  });

  it('leaves out the colours it is told to ignore, such as a text cursor (P3.4)', () => {
    const image = canvas(60, 30, '#151413', [ [ 10, 9, 2, 12, '#a9a297' ], [ 30, 6, 1, 18, '#eaebec' ] ]);
    assert.equal(fill(image, { ignore: [ '#eaebec' ] }).text, '#a9a297');
    assert.equal(fill(image).text, '#eaebec');
  });

  it('counts colours within 1 a channel of the fill as no text', () => {
    const image = canvas(40, 20, '#312e29', [ [ 0, 0, 5, 5, '#322f2a' ] ]);
    assert.equal(fill(image).text, null);
  });
});

describe('lines (P3.9)', () => {
  /** A canvas of `fill` with rectangles painted on it: [x, y, w, h, hex]. */
  function board(width, height, fill, rects = []) {
    const pixels = new Uint8Array(width * height * 4);
    const paint = (x0, y0, w, h, colour) => {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          pixels.set(hex(colour), (y * width + x) * 4);
        }
      }
    };
    paint(0, 0, width, height, fill);
    rects.forEach(r => paint(...r));
    return { width, height, pixels };
  }
  const TONE_1 = '#1c1a18', TONE_2 = '#25221f', TONE_0 = '#151413';

  it('finds a 1 px horizontal line between two areas of one tone', () => {
    const found = lines(board(80, 20, TONE_2, [ [ 0, 10, 80, 1, TONE_1 ] ]));
    assert.deepEqual(found, [ { orientation: 'horizontal', x: 0, y: 10, length: 80, thickness: 1, hex: TONE_1 } ]);
  });

  it('finds a 2 px vertical line, once, as a splitter between two views is', () => {
    const found = lines(board(60, 50, TONE_2, [ [ 30, 0, 2, 50, TONE_1 ] ]));
    assert.deepEqual(found, [ { orientation: 'vertical', x: 30, y: 0, length: 50, thickness: 2, hex: TONE_1 } ]);
  });

  it('finds no line in a band 3 px thick, such as a focus bar', () => {
    assert.deepEqual(lines(board(80, 20, TONE_2, [ [ 0, 10, 80, 3, '#d1b072' ] ])), []);
  });

  it('finds no line at an edge between two tones, nor in its blended row at a fractional scale', () => {
    // Tone 2 above, tone 0 below, and one row mixed of the two where they meet.
    assert.deepEqual(lines(board(80, 20, TONE_2, [ [ 0, 10, 80, 10, TONE_0 ], [ 0, 10, 80, 1, '#1d1b19' ] ])), []);
  });

  it('finds no line shorter than the minimum length, as a stroke of text is', () => {
    const image = board(80, 20, TONE_2, [ [ 4, 10, 20, 1, '#e8e3da' ] ]);
    assert.deepEqual(lines(image), []);
    assert.equal(lines(image, { minLength: 16 }).length, 1);
  });

  it('reports a line whose colour lies between its sides only with blends, since one row cannot tell it from an edge', () => {
    // Tone 1 between tone 0 and tone 2: a seam of the window's tone, or the row where tone 0 and tone 2 meet.
    const image = board(80, 20, TONE_2, [ [ 0, 0, 80, 10, TONE_0 ], [ 0, 10, 80, 1, TONE_1 ] ]);
    assert.deepEqual(lines(image), []);
    assert.deepEqual(lines(image, { blends: true }), [ { orientation: 'horizontal', x: 0, y: 10, length: 80, thickness: 1, hex: TONE_1 } ]);
  });

  it('finds no line within 3 a channel of both its sides, too faint to see', () => {
    assert.deepEqual(lines(board(80, 20, TONE_2, [ [ 0, 10, 80, 1, '#23211d' ] ])), []);
    assert.equal(lines(board(80, 20, TONE_2, [ [ 0, 10, 80, 1, '#211e1b' ] ])).length, 1);
  });

  it('looks only inside the region, and skips each region left out', () => {
    const image = board(80, 40, TONE_2, [ [ 0, 10, 80, 1, TONE_1 ], [ 0, 30, 80, 1, TONE_1 ] ]);
    assert.deepEqual(lines(image, { region: { x: 0, y: 0, width: 80, height: 20 } }).map(l => l.y), [ 10 ]);
    assert.deepEqual(lines(image, { leaveOut: [ { x: 0, y: 25, width: 80, height: 10 } ] }).map(l => l.y), [ 10 ]);
  });
});

describe('lightAlphas (P5.3)', () => {
  const over = { r: 0x15, g: 0x14, b: 0x13 };
  const light = { r: 0xd1, g: 0xb0, b: 0x72 };
  const composite = a => [ over.r + a * (light.r - over.r), over.g + a * (light.g - over.g), over.b + a * (light.b - over.b) ]
    .map(Math.round).concat(255);
  const alphas = [ 0, 0.1, 0.14, 0.5 ];

  it('recovers the alpha of a light', () => {
    const strip = picture(alphas.map(composite));
    const found = lightAlphas(strip, { x: 0, y: 0 }, { x: 3, y: 0 }, over, light);
    found.forEach((a, i) => assert.ok(Math.abs(a - alphas[i]) <= 0.005, `${a} for ${alphas[i]}`));
  });

  it('reads a diagonal, and refuses any other slope', () => {
    const square = { width: 4, height: 4, pixels: new Uint8Array(64).fill(255) };
    for (let i = 0; i < 4; i++) {
      square.pixels.set(composite(alphas[i]), (i * 4 + i) * 4);
    }
    const found = lightAlphas(square, { x: 0, y: 0 }, { x: 3, y: 3 }, over, light);
    assert.equal(found.length, 4);
    assert.ok(Math.abs(found[3] - 0.5) <= 0.005);
    assert.throws(() => lightAlphas(square, { x: 0, y: 0 }, { x: 3, y: 2 }, over, light), /row, column or diagonal/);
  });
});
