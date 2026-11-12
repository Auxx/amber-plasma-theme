import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { srgb8 } from './colour.mjs';
import { formatTokenValue } from './tokens.mjs';

/**
 * Every token a widget of the Union style uses, in the order written to
 * contents/css/tokens.css, under the same names (D-97). Tokens of the window
 * decoration, the terminal and the editor are left out.
 */
export const UNION_TOKENS = [
  'tone-0', 'tone-1', 'tone-2', 'tone-3', 'tone-4',
  'text', 'text-dim', 'accent', 'on-accent', 'danger', 'on-danger',
  'well', 'well-hover', 'raised-focus', 'well-focus', 'surface-focus', 'well-focus-edge', 'well-focus-edge-width',
  'accent-hover', 'accent-pressed', 'toggle', 'toggle-focus',
  'track', 'thumb', 'thumb-hover', 'thumb-pressed', 'selected', 'marker-width', 'popup'
];

const METADATA = fileURLToPath(new URL('../../../parts/union-style/amber/metadata.json', import.meta.url));

/** A token as Union CSS takes it: a length, or an opaque colour as #rrggbb. */
function plainValue(tokens, name) {
  let value = tokens.get(name);
  const seen = [ name ];
  while (value?.ref) {
    if (value.alpha !== undefined) {
      throw new Error(`--${name} is part transparent; the Union style's tokens are opaque`);
    }
    seen.push(value.ref);
    value = tokens.get(value.ref);
  }
  if (!value) {
    throw new Error(`Unknown token: ${seen.at(-1)}${seen.length > 1 ? ` (via ${seen.join(' → ')})` : ''}`);
  }
  if (value.length) {
    return formatTokenValue(value);
  }
  const { r, g, b, alpha } = srgb8(value.colour);
  if (alpha !== 1) {
    throw new Error(`--${name} is part transparent; the Union style's tokens are opaque`);
  }
  return `#${[ r, g, b ].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/** The text of contents/css/tokens.css, generated from the tokens. */
export function formatUnionTokens(tokens) {
  const { authors } = JSON.parse(readFileSync(METADATA, 'utf8'));
  const lines = UNION_TOKENS.map(name => {
    const own = tokens.get(name);
    const note = own?.ref ? ` /* ${formatTokenValue(own)} */` : '';
    return `    --${name}: ${plainValue(tokens, name)};${note}`;
  });
  return `/*
 * SPDX-License-Identifier: BSD-2-Clause
 * SPDX-FileCopyrightText: 2026 ${authors.at(-1)}
 *
 * Generated from prototype/tokens.css by \`generate union-style-tokens\`.
 * Do not edit: change the token and generate again.
 */

:root {
${lines.join('\n')}
}
`;
}
