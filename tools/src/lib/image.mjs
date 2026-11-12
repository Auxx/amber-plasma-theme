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

/** Every opaque colour with its count and bounding box, skipping fully transparent pixels. */
function tally(image, region) {
  const { x: x0, y: y0, width, height } = bounds(image, region);
  const seen = new Map();
  const { pixels } = image;
  for (let y = y0; y < y0 + height; y++) {
    for (let x = x0; x < x0 + width; x++) {
      const at = (y * image.width + x) * 4;
      if (pixels[at + 3] === 0) {
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
 */
export function coolGreys(image, { region } = {}) {
  const found = [];
  for (const entry of tally(image, region)) {
    if (isHue(entry.hex)) {
      continue;
    }
    const why = warmthOffence(entry.hex, { noHue: NO_HUE });
    if (why) {
      found.push({ hex: entry.hex, count: entry.count, box: box(entry), why });
    }
  }
  return found;
}

/** Hex → the name of the first opaque colour token, in file order, that has it. */
function tokenNames(tokens) {
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
