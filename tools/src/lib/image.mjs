// Reads the colours of a picture: which are cool greys by the rule the
// prototype check uses, and which are tokens. Used to check Amber's parts in
// screenshots of real applications (P2.3).
import { srgb8 } from './colour.mjs';
import { isHue, warmthOffence } from './prototype-check.mjs';
import { resolveToken } from './tokens.mjs';

// Below this OKLCH chroma a pixel has no hue: only r = g = b, give or take
// rounding. Tone 0 (chroma 0.003, hue 68) is then judged warm by its hue. (my call)
const NO_HUE = 0.001;

const toHex = (r, g, b) => `#${[ r, g, b ].map(v => v.toString(16).padStart(2, '0')).join('')}`;

/** The whole picture when no region is given; a region must lie inside it. */
function bounds(image, region) {
  if (!region) {
    return { x: 0, y: 0, width: image.width, height: image.height };
  }
  const { x, y, width, height } = region;
  if (width < 1 || height < 1 || x < 0 || y < 0 || x + width > image.width || y + height > image.height) {
    throw new Error(`region ${x},${y},${width},${height} is not inside the picture of ${image.width}×${image.height}`);
  }
  return region;
}

/**
 * Whether a colour lies within 8-bit rounding (±1 on each channel) of a warm
 * colour that has a hue. Two warm tones mixed at a part-pixel edge, as a 1 px
 * border at scale 1.49 is, round to such colours. A grey with r = g = b is not
 * excused by this: it has no hue at all. (my call)
 */
function roundsToWarm(hex) {
  const [ r, g, b ] = [ 1, 3, 5 ].map(i => parseInt(hex.slice(i, i + 2), 16));
  if (r === g && g === b) {
    return false;
  }
  for (const dr of [ -1, 0, 1 ]) {
    for (const dg of [ -1, 0, 1 ]) {
      for (const db of [ -1, 0, 1 ]) {
        const near = [ r + dr, g + dg, b + db ];
        if (near.some(v => v < 0 || v > 255) || (near[0] === near[1] && near[1] === near[2])) {
          continue;
        }
        if (!warmthOffence(toHex(...near), { noHue: NO_HUE })) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Whether a pixel lies in one of the rectangles. A rectangle may reach past the picture. */
const inside = (rects, x, y) => rects.some(r => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);

/**
 * Every opaque colour with its count and bounding box, skipping fully
 * transparent pixels and the pixels of `leaveOut`.
 */
function tally(image, region, leaveOut = []) {
  const { x: x0, y: y0, width, height } = bounds(image, region);
  const seen = new Map();
  const { pixels } = image;
  for (let y = y0; y < y0 + height; y++) {
    for (let x = x0; x < x0 + width; x++) {
      const at = (y * image.width + x) * 4;
      if (pixels[at + 3] === 0 || (leaveOut.length && inside(leaveOut, x, y))) {
        continue;
      }
      const key = (pixels[at] << 16) | (pixels[at + 1] << 8) | pixels[at + 2];
      const entry = seen.get(key);
      if (entry) {
        entry.count++;
        entry.left = Math.min(entry.left, x);
        entry.right = Math.max(entry.right, x);
        entry.bottom = y;
      } else {
        seen.set(key, { hex: toHex(pixels[at], pixels[at + 1], pixels[at + 2]), count: 1, left: x, right: x, top: y, bottom: y });
      }
    }
  }
  return [ ...seen.values() ].sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex));
}

const box = ({ left, right, top, bottom }) => ({ x: left, y: top, width: right - left + 1, height: bottom - top + 1 });

/**
 * The colours of the picture that are cool greys: not a hue (OKLCH chroma
 * below 0.05) and not warm or black, by `warmthOffence`. Most pixels first.
 * `leaveOut` lists rectangles whose pixels are not read, such as the parts
 * of a window that belong to another part of Amber (P3.9).
 */
export function coolGreys(image, { region, leaveOut } = {}) {
  const found = [];
  for (const entry of tally(image, region, leaveOut)) {
    if (isHue(entry.hex)) {
      continue;
    }
    const why = warmthOffence(entry.hex, { noHue: NO_HUE });
    if (why && !roundsToWarm(entry.hex)) {
      found.push({ hex: entry.hex, count: entry.count, box: box(entry), why });
    }
  }
  return found;
}

/** Hex → the name of the first opaque colour token, in file order, that has it. */
export function tokenNames(tokens) {
  const names = new Map();
  for (const name of tokens.keys()) {
    let colour;
    try {
      ({ colour } = resolveToken(tokens, name));
    } catch {
      continue; // a length
    }
    const { r, g, b, alpha } = srgb8(colour);
    const hex = toHex(r, g, b);
    if (alpha === 1 && !names.has(hex)) {
      names.set(hex, name);
    }
  }
  return names;
}

/** Every colour of the picture with its count, most first; `token` names it when a token has exactly that colour. */
export function colourCounts(image, { region, tokens } = {}) {
  const names = tokens ? tokenNames(tokens) : new Map();
  return tally(image, region).map(({ hex, count }) => (names.has(hex) ? { hex, count, token: names.get(hex) } : { hex, count }));
}

const channels = h => [ 1, 3, 5 ].map(i => parseInt(h.slice(i, i + 2), 16));

/**
 * The fill and the text colour of a widget drawn alone. The fill is the most
 * common colour. The text is the colour farthest from the fill in RGB, or null
 * when every other colour is within ±1 a channel of the fill: small text at
 * scale 1 is mostly anti-aliased blends of the two, and only a few pixels
 * reach the full text colour (P3.3). Pixels within ±1 of `surface`, or of a
 * colour in `ignore` (such as a text cursor), are left out of both. With
 * `foot`, the bottom `foot` rows, where a focused well has its focus bar, are
 * left out too, and their most common colour is returned as `foot` (P3.4).
 */
export function fill(image, { surface, region, foot = 0, ignore = [] } = {}) {
  const whole = bounds(image, region);
  const away = [ surface, ...ignore ].filter(Boolean).map(channels);
  const keep = e => !away.some(a => near(channels(e.hex), a));
  const body = foot > 0 ? { ...whole, height: whole.height - foot } : whole;
  if (body.height < 1) {
    throw new Error(`a foot of ${foot} rows leaves nothing of a picture ${whole.height} px high`);
  }
  const counted = tally(image, body).filter(keep);
  const footed = foot > 0 ? { foot: tally(image, { ...whole, y: whole.y + body.height, height: foot }).filter(keep)[0]?.hex ?? null } : {};
  if (!counted.length) {
    return { background: null, text: null, ...footed };
  }
  const [ first, ...rest ] = counted;
  const bg = channels(first.hex);
  const distance = e => channels(e.hex).reduce((sum, v, i) => sum + (v - bg[i]) ** 2, 0);
  const text = rest
    .filter(e => !near(channels(e.hex), bg))
    .reduce((best, e) => (!best || distance(e) > distance(best) ? e : best), null);
  return { background: first.hex, text: text ? text.hex : null, ...footed };
}

/** A copy of the picture with every pixel of the given colours painted magenta. */
export function markPixels(image, hexes) {
  const marked = new Set(hexes.map(h => h.toLowerCase()));
  const pixels = Uint8Array.from(image.pixels);
  for (let at = 0; at < pixels.length; at += 4) {
    if (pixels[at + 3] !== 0 && marked.has(toHex(pixels[at], pixels[at + 1], pixels[at + 2]))) {
      pixels.set([ 255, 0, 255, 255 ], at);
    }
  }
  return { width: image.width, height: image.height, pixels };
}

const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const CORNERS = { tl: [ 'top', 'left' ], tr: [ 'top', 'right' ], bl: [ 'bottom', 'left' ], br: [ 'bottom', 'right' ] };
const LINE_DEPTH = 3; // a run of 1 or 2 px at the edge is a line; 3 px or more is a band (P3.2, my call)

const rgbOf = hex => [ 1, 3, 5 ].map(i => parseInt(hex.slice(i, i + 2), 16));
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

function mode(colours) {
  const counts = new Map();
  for (const c of colours) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best = null;
  for (const [ c, n ] of counts) {
    if (best === null || n > counts.get(best)) {
      best = c;
    }
  }
  return best;
}

/**
 * Whether a widget drawn on a known surface has rounded corners or lines one
 * or two pixels thick at its edges (P3.2). The box is every pixel that is not
 * the surface (±1 a channel; fully transparent counts as surface). Nothing is
 * judged unless one colour fills half the box, which text never does. A side is
 * judged only when its longest run of drawn pixels covers a quarter of it, so
 * that text alone is not judged; a corner only when both its sides are. A
 * corner is rounded when its pixel is nearer the surface than the box's most
 * common colour. A side has a line when its outer colour differs from the
 * colour 3 px in and runs for 1 or 2 px, or when the whole box is only 1 or
 * 2 px across it, as a separator drawn alone is.
 */
export function frame(image, { surface, region } = {}) {
  const { x: rx, y: ry, width: rw, height: rh } = bounds(image, region);
  const base = rgbOf(surface);
  const at = (x, y) => {
    const i = (y * image.width + x) * 4;
    return image.pixels[i + 3] === 0 ? null : [ image.pixels[i], image.pixels[i + 1], image.pixels[i + 2] ];
  };
  const drawnAt = (x, y) => {
    const c = at(x, y);
    return c !== null && !near(c, base);
  };

  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  const drawnColours = [];
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (drawnAt(x, y)) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        drawnColours.push(toHex(...at(x, y)));
      }
    }
  }
  const unjudged = {
    corners: Object.fromEntries(Object.keys(CORNERS).map(k => [ k, 'not judged' ])),
    sides: Object.fromEntries(SIDES.map(s => [ s, 'not judged' ]))
  };
  if (x1 < 0) {
    return { drawn: false, box: null, ...unjudged, lines: {} };
  }
  const fillHex = mode(drawnColours);
  const fill = rgbOf(fillHex);
  // Text has no colour that fills half of its box; a widget's background does.
  const solid = drawnColours.filter(c => c === fillHex).length * 2 >= (x1 - x0 + 1) * (y1 - y0 + 1);
  if (!solid) {
    return { drawn: true, box: { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }, ...unjudged, lines: {} };
  }

  // The pixel of a side at position `i` along it and `d` px in from the edge.
  const point = {
    top: (i, d) => [ x0 + i, y0 + d ],
    bottom: (i, d) => [ x0 + i, y1 - d ],
    left: (i, d) => [ x0 + d, y0 + i ],
    right: (i, d) => [ x1 - d, y0 + i ]
  };
  const length = side => (side === 'top' || side === 'bottom' ? x1 - x0 + 1 : y1 - y0 + 1);
  const depthMax = side => (side === 'top' || side === 'bottom' ? y1 - y0 : x1 - x0);

  const sides = {};
  const lines = {};
  const runs = {};
  const outers = {};
  for (const side of SIDES) {
    const n = length(side);
    let best = [ 0, -1 ], start = null;
    for (let i = 0; i <= n; i++) {
      const on = i < n && drawnAt(...point[side](i, 0));
      if (on && start === null) {
        start = i;
      } else if (!on && start !== null) {
        if (i - start > best[1] - best[0] + 1) {
          best = [ start, i - 1 ];
        }
        start = null;
      }
    }
    const run = best[1] - best[0] + 1;
    if (run < Math.max(3, n / 4)) {
      sides[side] = 'not judged';
      continue;
    }
    runs[side] = best;
    if (depthMax(side) < LINE_DEPTH) {
      // The whole box is 1 or 2 px across this side: a separator drawn alone.
      sides[side] = 'line';
      lines[side] = { hex: fillHex, thickness: depthMax(side) + 1 };
      continue;
    }
    const colourAt = d => {
      const colours = [];
      for (let i = best[0]; i <= best[1]; i++) {
        const c = at(...point[side](i, d));
        colours.push(c === null ? surface : toHex(...c));
      }
      return mode(colours);
    };
    const outer = colourAt(0);
    outers[side] = rgbOf(outer);
    if (near(rgbOf(outer), rgbOf(colourAt(LINE_DEPTH)))) {
      sides[side] = 'clear';
      continue;
    }
    let thickness = 1;
    while (thickness < LINE_DEPTH && colourAt(thickness) === outer) {
      thickness++;
    }
    if (thickness < LINE_DEPTH) {
      sides[side] = 'line';
      lines[side] = { hex: outer, thickness };
    } else {
      sides[side] = 'clear';
    }
  }

  const cornerPixel = { tl: [ x0, y0 ], tr: [ x1, y0 ], bl: [ x0, y1 ], br: [ x1, y1 ] };
  const corners = {};
  for (const [ name, [ a, b ] ] of Object.entries(CORNERS)) {
    if (!runs[a] || !runs[b]) {
      corners[name] = 'not judged';
      continue;
    }
    // A side may end in a band of its own colour, such as a focus bar (P3.4): a
    // corner of that colour is as square as one of the fill.
    const c = at(...cornerPixel[name]) ?? base;
    const drawnNearest = Math.min(distance(c, fill), ...[ a, b ].filter(side => outers[side]).map(side => distance(c, outers[side])));
    corners[name] = distance(c, base) < drawnNearest ? 'rounded' : 'square';
  }
  return { drawn: true, box: { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }, corners, sides, lines };
}

/** Whether `c` lies between `a` and `b` on every channel, give or take 1: a blend at an edge. */
const between = (c, a, b) => c.every((v, i) => v >= Math.min(a[i], b[i]) - 1 && v <= Math.max(a[i], b[i]) + 1);

/**
 * Every straight line 1 or 2 px thick and at least `minLength` px long (P3.9):
 * a run of one colour whose pixels on both sides differ from it, which is not
 * a blend of its two sides, as the row where two tones meet at a fractional
 * scale is. A band 3 px or more thick is not a line; nor is a short stroke of
 * text. `region` limits the search, and `leaveOut` skips rectangles in it.
 */
export function lines(image, { region, leaveOut = [], minLength = 32 } = {}) {
  const { x: rx, y: ry, width: rw, height: rh } = bounds(image, region);
  const rgb = (x, y) => {
    const i = (y * image.width + x) * 4;
    return [ image.pixels[i], image.pixels[i + 1], image.pixels[i + 2] ];
  };
  const skipped = (x, y) => leaveOut.length && inside(leaveOut, x, y);
  const found = [];
  // `along` walks the line's length, `across` its thickness; `pixel(a, c)` maps them to the picture.
  const scan = (orientation, alongFrom, alongTo, acrossFrom, acrossTo, pixel) => {
    for (const thickness of [ 1, 2 ]) {
      for (let c = acrossFrom + 1; c + thickness < acrossTo; c++) {
        let start = null, colour = null;
        const close = end => {
          if (start !== null && end - start >= minLength) {
            const [ x, y ] = pixel(start, c);
            found.push({ orientation, x, y, length: end - start, thickness, hex: toHex(...colour) });
          }
          start = null; colour = null;
        };
        for (let a = alongFrom; a <= alongTo; a++) {
          let on = false, here = null;
          if (a < alongTo && !skipped(...pixel(a, c))) {
            here = rgb(...pixel(a, c));
            const second = thickness === 2 ? rgb(...pixel(a, c + 1)) : here;
            const before = rgb(...pixel(a, c - 1));
            const after = rgb(...pixel(a, c + thickness));
            on = near(here, second) && !near(here, before) && !near(here, after) && !between(here, before, after)
              && (thickness === 1 || !near(second, after));
          }
          if (on && start !== null && !near(here, colour)) {
            close(a);
          }
          if (on && start === null) {
            start = a; colour = here;
          } else if (!on) {
            close(a);
          }
        }
      }
    }
  };
  scan('horizontal', rx, rx + rw, ry, ry + rh, (a, c) => [ a, c ]);
  scan('vertical', ry, ry + rh, rx, rx + rw, (a, c) => [ c, a ]);
  return found;
}
