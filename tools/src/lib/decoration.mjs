import { srgb8 } from './colour.mjs';
import { resolveToken } from './tokens.mjs';

/**
 * Amber's window decoration, the Aurorae theme `amber`
 * (docs/architecture/platform.md, "Window decoration"). Its frame,
 * `decoration.svg`, and its `amberrc` are generated from the tokens; its
 * `metadata.desktop` is written by hand. The frame is the nine plain
 * rectangles of spike P0.4 for each window state: the edges and corners one
 * `outline-width` thick in `outline`, the centre, which is the title bar, in
 * `tone-0` (P5.1). The window buttons are one file each, with one element per
 * state, drawn as the prototype's gallery draws them (P5.2).
 */

/** The nine elements of a frame, as Aurorae names them. */
export const SIDES = [ 'topleft', 'top', 'topright', 'left', 'center', 'right', 'bottomleft', 'bottom', 'bottomright' ];

/** The size of the centre element in the SVG; Aurorae stretches it (my call). */
const CENTRE = 30;
/** The gap between the active and the inactive frame in the SVG (my call). */
const GAP = 8;

const SPDX = [ "SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov", 'SPDX-License-Identifier: MIT' ];
const GENERATED = 'Generated from prototype/tokens.css by tools/src/lib/decoration.mjs.';
const DO_NOT_EDIT = 'Do not edit: run node tools/src/bin/generate.mjs decoration --write';
/** The same in the SVG, where an XML comment may not hold a double hyphen: one made the file unreadable to Aurorae (P5.1). */
const DO_NOT_EDIT_SVG = 'Do not edit: run node tools/src/bin/generate.mjs decoration with the write option';

/** Reads tokens, collecting problems rather than throwing at the first. */
function reader(tokens) {
  const problems = [];
  const colour = name => {
    try {
      const rgb = srgb8(resolveToken(tokens, name).colour);
      if (rgb.alpha !== 1) {
        problems.push(`${name}: is not opaque`);
        return undefined;
      }
      return rgb;
    } catch (error) {
      problems.push(`${name}: ${error.message}`);
      return undefined;
    }
  };
  const length = (name, min = 1) => {
    let value = tokens.get(name);
    const seen = [ name ];
    while (value?.ref && !seen.includes(value.ref)) {
      seen.push(value.ref);
      value = tokens.get(value.ref);
    }
    if (!value) {
      problems.push(`${name}: unknown token`);
    } else if (!value.length) {
      problems.push(`${name}: is not a length`);
    } else if (value.length.unit !== 'px' || !Number.isInteger(value.length.value) || value.length.value < min) {
      problems.push(`${name}: must be a whole px of at least ${min}, not ${value.length.value}${value.length.unit}`);
    } else {
      return value.length.value;
    }
    return 1;
  };
  const check = () => {
    if (problems.length) {
      throw new Error(problems.join('\n'));
    }
  };
  return { colour, length, check };
}

const hexOf = rgb => `#${[ rgb.r, rgb.g, rgb.b ].map(v => v.toString(16).padStart(2, '0')).join('')}`;

/**
 * The stops of the eased fade of the window glow and the shadow, as
 * `[offset, mix]`: the share of the light's length, and the share of the
 * light's colour there. Before the first stop the mix is 1; between stops it
 * is linear. The prototype holds them in `--light-fade` of
 * prototype/window.css, and a spec ties the two (D-61, P5.3).
 */
export const FADE = [
  [ 0.056, 1 ], [ 0.127, 0.885 ], [ 0.197, 0.772 ], [ 0.268, 0.607 ], [ 0.338, 0.501 ], [ 0.408, 0.386 ],
  [ 0.479, 0.279 ], [ 0.549, 0.2 ], [ 0.62, 0.122 ], [ 0.69, 0.071 ], [ 0.831, 0.029 ], [ 1, 0 ]
];

/** The mix of the fade at `t`, a share of the light's length. */
function mixAt(t) {
  if (t <= FADE[0][0]) {
    return 1;
  }
  for (let k = 1; k < FADE.length; k++) {
    const [ o1, m1 ] = FADE[k - 1];
    const [ o2, m2 ] = FADE[k];
    if (t <= o2) {
      return m1 + (t - o1) / (o2 - o1) * (m2 - m1);
    }
  }
  return 0;
}

/** Reads a colour that may be part transparent, as `{ r, g, b, a }`. */
function lightColour(tokens, name) {
  const { r, g, b, alpha } = srgb8(resolveToken(tokens, name).colour);
  return { r, g, b, a: Math.round(alpha * 10000) / 10000 };
}

/**
 * The light of each window state, as the prototype draws it: the window
 * glow of the active window and the shadow of an inactive one, each of whose
 * fade may start inside the window on each side, by its insets (D-59, D-60). `{ active, inactive }`, each `{ colour: { r, g, b, a },
 * size, inset: { top, left, right, bottom } }`, lengths in px.
 */
export function lights(tokens) {
  const read = reader(tokens);
  const glowSize = read.length('glow-size');
  const shadowSize = read.length('shadow-size');
  const top = read.length('shadow-inset-top');
  const side = read.length('shadow-inset-side');
  const bottom = read.length('shadow-inset-bottom');
  const glowTop = read.length('glow-inset-top', 0);
  const glowSide = read.length('glow-inset-side', 0);
  const glowBottom = read.length('glow-inset-bottom', 0);
  read.check();
  return {
    active: {
      colour: lightColour(tokens, 'glow'), size: glowSize,
      inset: { top: glowTop, left: glowSide, right: glowSide, bottom: glowBottom }
    },
    inactive: { colour: lightColour(tokens, 'shadow'), size: shadowSize, inset: { top, left: side, right: side, bottom } }
  };
}

/** The alpha of a light `d` px out from the window outline's outer edge on a side. */
export function fade(light, side, d) {
  return light.colour.a * mixAt((light.inset[side] + d) / light.size);
}

/**
 * The alpha of a light `d` px out along a corner's diagonal from the window
 * outline's outer corner. The light is the distance to the window shrunk by
 * the light's insets, so beyond a corner it fades round that rectangle's
 * corner, as `window.css` draws it.
 */
export function cornerFade(light, corner, d) {
  const a = d / Math.SQRT2;
  const v = light.inset[corner.startsWith('top') ? 'top' : 'bottom'];
  const h = light.inset[corner.endsWith('left') ? 'left' : 'right'];
  return light.colour.a * mixAt(Math.hypot(h + a, v + a) / light.size);
}

/**
 * The padding of the `rc` file on each side: room for the longer of the two
 * lights, `max(glow-size, shadow-size − shadow-inset-<side>)`, in whole px.
 */
export function padding(tokens) {
  const { active, inactive } = lights(tokens);
  const reach = side => Math.max(active.size - active.inset[side], inactive.size - inactive.inset[side]);
  return { top: reach('top'), left: reach('left'), right: reach('right'), bottom: reach('bottom') };
}

const round4 = v => Math.round(v * 10000) / 10000;
const LIGHT_SIDES = [ 'top', 'left', 'right', 'bottom' ];

/**
 * The stops of a linear gradient that draws a light on one side across
 * `thickness` px from the window outline outwards: the stops of FADE that fall
 * there, and one at each end, so that no gradient starts outside its element.
 */
function edgeStops(light, side, thickness) {
  const offsets = new Set([ 0, 1 ]);
  for (const [ o ] of FADE) {
    const d = o * light.size - light.inset[side];
    if (d > 0 && d < thickness) {
      offsets.add(round4(d / thickness));
    }
  }
  return [ ...offsets ].sort((a, b) => a - b).map(f => [ f, round4(fade(light, side, f * thickness)) ]);
}

/**
 * The file `decoration.svg`: both frames, the inactive one below the active
 * one. Each edge and corner element holds, from the outside in, the light of
 * its window state in the padding, the window outline, and tone 0 as far in
 * as the shadow's fade starts, so that a corner can draw the light round the
 * corner of the window shrunk by its insets, as the prototype does (P5.3,
 * Design A: an Aurorae element may reach inside the window; what lies under
 * the application is hidden by it). The light is the distance to that shrunk
 * window: a radial gradient beyond its corner, a linear one elsewhere.
 */
export function formatDecorationSvg(tokens) {
  const read = reader(tokens);
  const outlineColour = read.colour('outline');
  const titleBarColour = read.colour('tone-0');
  const w = read.length('outline-width');
  read.check();
  const outline = hexOf(outlineColour);
  const titleBar = hexOf(titleBarColour);
  const states = lights(tokens);
  const pad = padding(tokens);
  const reach = Object.fromEntries(LIGHT_SIDES.map(side =>
    [ side, Math.max(states.active.inset[side], states.inactive.inset[side]) ]));
  const L = pad.left + w + reach.left;
  const R = pad.right + w + reach.right;
  const T = pad.top + w + reach.top;
  const B = pad.bottom + w + reach.bottom;
  const frameHeight = T + CENTRE + B;
  const defs = [];
  const groups = [];
  const rect = (x, y, width, height, fill) =>
    (width > 0 && height > 0 ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>` : '');
  for (const [ index, [ prefix, state ] ] of [ [ 'decoration', 'active' ], [ 'decoration-inactive', 'inactive' ] ].entries()) {
    const light = states[state];
    const colour = hexOf(light.colour);
    const stop = ([ offset, opacity ]) => `<stop offset="${offset}" stop-color="${colour}" stop-opacity="${opacity}"/>`;
    const linear = {};
    const toward = { top: [ 0, 1, 0, 0 ], bottom: [ 0, 0, 0, 1 ], left: [ 1, 0, 0, 0 ], right: [ 0, 0, 1, 0 ] };
    for (const side of LIGHT_SIDES) {
      const id = `${state}-${side}`;
      const [ x1, y1, x2, y2 ] = toward[side];
      defs.push(`    <linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
        edgeStops(light, side, pad[side]).map(stop).join('') + '</linearGradient>');
      linear[side] = `url(#${id})`;
    }
    const x0 = 0;
    const x1 = L;
    const x2 = L + CENTRE;
    const y0 = index * (frameHeight + GAP);
    const y1 = y0 + T;
    const y2 = y1 + CENTRE;
    const group = (side, ...body) => groups.push(`  <g id="${prefix}-${side}">${body.join('')}</g>`);
    group('top', rect(x1, y0, CENTRE, pad.top, linear.top), rect(x1, y0 + pad.top, CENTRE, w, outline),
      rect(x1, y0 + pad.top + w, CENTRE, reach.top, titleBar));
    group('left', rect(x0, y1, pad.left, CENTRE, linear.left), rect(x0 + pad.left, y1, w, CENTRE, outline),
      rect(x0 + pad.left + w, y1, reach.left, CENTRE, titleBar));
    group('center', rect(x1, y1, CENTRE, CENTRE, titleBar));
    group('right', rect(x2, y1, reach.right, CENTRE, titleBar), rect(x2 + reach.right, y1, w, CENTRE, outline),
      rect(x2 + reach.right + w, y1, pad.right, CENTRE, linear.right));
    group('bottom', rect(x1, y2, CENTRE, reach.bottom, titleBar), rect(x1, y2 + reach.bottom, CENTRE, w, outline),
      rect(x1, y2 + reach.bottom + w, CENTRE, pad.bottom, linear.bottom));
    // A corner element at (ex, ey), ew × eh. Outward is towards smaller x when sx < 0, smaller y when sy < 0.
    const corner = (name, ex, ey, ew, eh, sx, sy) => {
      const vSide = sy < 0 ? 'top' : 'bottom';
      const hSide = sx < 0 ? 'left' : 'right';
      const ix = sx < 0 ? pad.left : ew - pad.right; // the outline's outer edge, across
      const iy = sy < 0 ? pad.top : eh - pad.bottom; // and down
      const cx = ix - sx * light.inset[hSide]; // the corner of the window shrunk by the insets
      const cy = iy - sy * light.inset[vSide];
      const id = `${state}-${name}`;
      defs.push(`    <radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${ex + cx}" cy="${ey + cy}" r="${light.size}">` +
        [ [ 0, 1 ], ...FADE ].map(([ o, m ]) => stop([ o, round4(light.colour.a * m) ])).join('') + '</radialGradient>');
      const radial = `url(#${id})`;
      /** The part of [0, length) outward of `at`, and the part inward, as [start, size]. */
      const split = (at, length, sign) => (sign < 0 ? [ [ 0, at ], [ at, length - at ] ] : [ [ at, length - at ], [ 0, at ] ]);
      const [ outX, inX ] = split(ix, ew, sx);
      const [ outY, inY ] = split(iy, eh, sy);
      const [ beyondX, besideX ] = split(Math.min(ew, Math.max(0, cx)), ew, sx);
      const clip = ([ s1, n1 ], [ s2, n2 ]) => [ Math.max(s1, s2), Math.min(s1 + n1, s2 + n2) - Math.max(s1, s2) ];
      const [ beyondY, besideY ] = split(Math.min(eh, Math.max(0, cy)), eh, sy);
      const at = ([ x, width ], [ y, height ], fill) => rect(ex + x, ey + y, width, height, fill);
      const outlineX = sx < 0 ? [ ix, w ] : [ ix - w, w ];
      const outlineY = sy < 0 ? [ iy, w ] : [ iy - w, w ];
      const innerX = sx < 0 ? [ ix + w, ew - ix - w ] : [ 0, ix - w ];
      const innerY = sy < 0 ? [ iy + w, eh - iy - w ] : [ 0, iy - w ];
      group(name,
        // Outside the outline across the whole width: radial beyond the shrunk corner, straight beside it.
        at(beyondX, outY, radial), at(besideX, outY, linear[vSide]),
        // Outside the outline beside it, below or above that band.
        at(outX, clip(beyondY, inY), radial), at(outX, clip(besideY, inY), linear[hSide]),
        // The outline, and tone 0 inside it.
        at(outlineX, inY, outline), at(innerX, outlineY, outline), at(innerX, innerY, titleBar));
    };
    corner('topleft', x0, y0, L, T, -1, -1);
    corner('topright', x2, y0, R, T, 1, -1);
    corner('bottomleft', x0, y2, L, B, -1, 1);
    corner('bottomright', x2, y2, R, B, 1, 1);
  }
  const width = L + CENTRE + R;
  const height = 2 * frameHeight + GAP;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    ...[ ...SPDX, GENERATED, DO_NOT_EDIT_SVG ].map(line => `<!-- ${line} -->`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '  <defs>',
    ...defs,
    '  </defs>',
    ...groups,
    '</svg>',
    ''
  ].join('\n');
}

const sorted = entries => entries.sort(([ a ], [ b ]) => (a < b ? -1 : a > b ? 1 : 0)).map(([ k, v ]) => `${k}=${v}`);

/** The file `amberrc`: the title's colours and alignment, and the frame's layout. */
export function formatDecorationRc(tokens) {
  const read = reader(tokens);
  const text = read.colour('text');
  const dim = read.colour('text-dim');
  const w = read.length('outline-width');
  const title = read.length('title-bar-height');
  read.check();
  const pad = padding(tokens);
  const rgba = rgb => `${rgb.r},${rgb.g},${rgb.b},255`;
  const general = sorted([
    [ 'ActiveTextColor', rgba(text) ],
    [ 'InactiveTextColor', rgba(dim) ],
    [ 'TitleAlignment', 'Center' ],
    [ 'TitleVerticalAlignment', 'Center' ],
    [ 'Animation', 0 ],
    [ 'Shadow', 'true' ]
  ]);
  const layout = sorted([
    [ 'BorderLeft', w ], [ 'BorderRight', w ], [ 'BorderBottom', w ],
    [ 'TitleEdgeTop', w ], [ 'TitleEdgeBottom', 0 ], [ 'TitleEdgeLeft', w ], [ 'TitleEdgeRight', w ],
    [ 'TitleBorderLeft', 0 ], [ 'TitleBorderRight', 0 ], [ 'TitleHeight', title ],
    [ 'ButtonWidth', title ], [ 'ButtonHeight', title ], [ 'ButtonSpacing', 0 ], [ 'ButtonMarginTop', 0 ],
    [ 'PaddingTop', pad.top ], [ 'PaddingBottom', pad.bottom ], [ 'PaddingLeft', pad.left ], [ 'PaddingRight', pad.right ]
  ]);
  return [
    ...[ ...SPDX, GENERATED, DO_NOT_EDIT ].map(line => `# ${line}`),
    '',
    '[General]',
    ...general,
    '',
    '[Layout]',
    ...layout,
    ''
  ].join('\n');
}

/**
 * The states of a window button, as Aurorae's prefixes, each with the tokens
 * of its fill and glyph for minimise, maximise and restore (`plain`) and for
 * close (P5.2; prototype/window.css).
 */
export const BUTTON_STATES = [
  { prefix: 'active', fill: { plain: 'tone-0', close: 'tone-0' }, glyph: { plain: 'text', close: 'text' } },
  { prefix: 'hover', fill: { plain: 'tone-1', close: 'danger' }, glyph: { plain: 'text', close: 'on-danger' } },
  { prefix: 'pressed', fill: { plain: 'tone-2', close: 'danger' }, glyph: { plain: 'text', close: 'on-danger' } },
  { prefix: 'inactive', fill: { plain: 'tone-0', close: 'tone-0' }, glyph: { plain: 'text-dim', close: 'text-dim' } },
  { prefix: 'hover-inactive', fill: { plain: 'tone-1', close: 'danger' }, glyph: { plain: 'text-dim', close: 'on-danger' } },
  { prefix: 'pressed-inactive', fill: { plain: 'tone-2', close: 'danger' }, glyph: { plain: 'text-dim', close: 'on-danger' } }
];

/** The glyphs of the window buttons, in a box of GLYPH units, as the prototype draws them. */
export const GLYPHS = {
  minimize: 'M3 8.5h10',
  maximize: 'M3.5 3.5h9v9h-9z',
  restore: 'M3.5 6h6.5v6.5h-6.5zM6 6V3.5h6.5V10H10',
  close: 'M4 4l8 8M12 4l-8 8'
};

/** The glyph's box and stroke, as window.css draws them. */
const GLYPH = 16;
const STROKE = 1.5;

/**
 * The file `<button>.svg`: one `<prefix>-center` element per state, side by
 * side. A transparent rectangle the button's size sets the element's box,
 * which KSvg stretches to the button; the state's fill inside it keeps one
 * `outline-width` off the top, and off the right for close, the last button
 * by KWin's default, so that at a fractional scale the button does not
 * cover the window outline's inner device pixel (D-130).
 */
export function formatButtonSvg(tokens, button) {
  if (!Object.hasOwn(GLYPHS, button)) {
    throw new Error(`${button}: not a window button (${Object.keys(GLYPHS).join(', ')})`);
  }
  const read = reader(tokens);
  const size = read.length('title-bar-height');
  const w = read.length('outline-width');
  const kind = button === 'close' ? 'close' : 'plain';
  const colours = BUTTON_STATES.map(({ fill, glyph }) => [ read.colour(fill[kind]), read.colour(glyph[kind]) ]);
  read.check();
  const inset = (size - GLYPH) / 2;
  const groups = BUTTON_STATES.map(({ prefix }, i) => {
    const x = i * (size + GAP);
    const [ fill, glyph ] = colours[i];
    return [
      `  <g id="${prefix}-center">`,
      `    <rect x="${x}" y="0" width="${size}" height="${size}" fill="#000000" fill-opacity="0"/>`,
      `    <rect x="${x}" y="${w}" width="${size - (button === 'close' ? w : 0)}" height="${size - w}" fill="${hexOf(fill)}"/>`,
      `    <path transform="translate(${x + inset} ${inset})" d="${GLYPHS[button]}" fill="none" stroke="${hexOf(glyph)}" ` +
        `stroke-width="${STROKE}" stroke-linecap="square"/>`,
      '  </g>'
    ].join('\n');
  });
  const width = BUTTON_STATES.length * (size + GAP) - GAP;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    ...[ ...SPDX, GENERATED, DO_NOT_EDIT_SVG ].map(line => `<!-- ${line} -->`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${size}" viewBox="0 0 ${width} ${size}">`,
    ...groups,
    '</svg>',
    ''
  ].join('\n');
}
