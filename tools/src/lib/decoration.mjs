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
  const length = name => {
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
    } else if (value.length.unit !== 'px' || !Number.isInteger(value.length.value) || value.length.value < 1) {
      problems.push(`${name}: must be a whole px of at least 1, not ${value.length.value}${value.length.unit}`);
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

/** The file `decoration.svg`: both frames, the inactive one below the active one. */
export function formatDecorationSvg(tokens) {
  const read = reader(tokens);
  const outline = read.colour('outline');
  const titleBar = read.colour('tone-0');
  const w = read.length('outline-width');
  read.check();
  const size = [ w, CENTRE, w ];
  const start = [ 0, w, w + CENTRE ];
  const frameHeight = 2 * w + CENTRE;
  const rects = [];
  for (const [ state, prefix ] of [ [ 0, 'decoration' ], [ 1, 'decoration-inactive' ] ]) {
    SIDES.forEach((side, i) => {
      const column = i % 3;
      const row = Math.floor(i / 3);
      const fill = side === 'center' ? titleBar : outline;
      rects.push(`  <rect id="${prefix}-${side}" x="${start[column]}" y="${state * (frameHeight + GAP) + start[row]}" ` +
        `width="${size[column]}" height="${size[row]}" fill="${hexOf(fill)}"/>`);
    });
  }
  const width = frameHeight;
  const height = 2 * frameHeight + GAP;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    ...[ ...SPDX, GENERATED, DO_NOT_EDIT_SVG ].map(line => `<!-- ${line} -->`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ...rects,
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
    [ 'PaddingTop', 0 ], [ 'PaddingBottom', 0 ], [ 'PaddingLeft', 0 ], [ 'PaddingRight', 0 ]
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

/** The file `<button>.svg`: one `<prefix>-center` element per state, side by side. */
export function formatButtonSvg(tokens, button) {
  if (!Object.hasOwn(GLYPHS, button)) {
    throw new Error(`${button}: not a window button (${Object.keys(GLYPHS).join(', ')})`);
  }
  const read = reader(tokens);
  const size = read.length('title-bar-height');
  const kind = button === 'close' ? 'close' : 'plain';
  const colours = BUTTON_STATES.map(({ fill, glyph }) => [ read.colour(fill[kind]), read.colour(glyph[kind]) ]);
  read.check();
  const inset = (size - GLYPH) / 2;
  const groups = BUTTON_STATES.map(({ prefix }, i) => {
    const x = i * (size + GAP);
    const [ fill, glyph ] = colours[i];
    return [
      `  <g id="${prefix}-center">`,
      `    <rect x="${x}" y="0" width="${size}" height="${size}" fill="${hexOf(fill)}"/>`,
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
