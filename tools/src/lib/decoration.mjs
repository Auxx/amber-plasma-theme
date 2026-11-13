import { srgb8 } from './colour.mjs';
import { resolveToken } from './tokens.mjs';

/**
 * Amber's window decoration, the Aurorae theme `amber`
 * (docs/architecture/platform.md, "Window decoration"). Its frame,
 * `decoration.svg`, and its `amberrc` are generated from the tokens; its
 * `metadata.desktop` is written by hand. The frame is the nine plain
 * rectangles of spike P0.4 for each window state: the edges and corners one
 * `outline-width` thick in `outline`, the centre, which is the title bar, in
 * `tone-0` (P5.1).
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
    [ 'ButtonWidth', title ], [ 'ButtonHeight', title ], [ 'ButtonSpacing', 0 ],
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
