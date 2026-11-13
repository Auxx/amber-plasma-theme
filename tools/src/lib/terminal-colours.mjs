import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describeColour, srgb8 } from './colour.mjs';
import { resolveToken } from './tokens.mjs';

/**
 * Amber's terminal colours, the Konsole file `Amber.colorscheme`
 * (docs/architecture/platform.md, "Konsole and Kate"). The groups were read on
 * 2026-11-13 from the colour schemes built into libkonsoleprivate.so.26.08.2.
 * Every colour key takes a token from parts/terminal-colours/keys.json (D-118).
 */

/** The table of keys, read by the generator. */
export const KEYS_FILE = fileURLToPath(new URL('../../../parts/terminal-colours/keys.json', import.meta.url));

const VARIANTS = [ '', 'Faint', 'Intense' ];

/** The colour keys of a Konsole colour scheme, each a group of the file, in file order. */
export const COLOUR_KEYS = [
  ...VARIANTS.map(variant => `Background${variant}`),
  ...[ 0, 1, 2, 3, 4, 5, 6, 7 ].flatMap(n => VARIANTS.map(variant => `Color${n}${variant}`)),
  ...VARIANTS.map(variant => `Foreground${variant}`)
].sort();

/** The `[General]` group, sorted (my call: no blur, no random colours, opaque, no wallpaper). */
const GENERAL = [ 'Blur=false', 'ColorRandomization=false', 'Description=Amber', 'Opacity=1', 'Wallpaper=' ];

/** The header of the generated file. */
const HEADER = [
  "# SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov",
  '# SPDX-License-Identifier: MIT',
  '# Generated from prototype/tokens.css and parts/terminal-colours/keys.json.',
  '# Do not edit: run node tools/src/bin/generate.mjs terminal-colours --write'
];

/** Reads the table: an object of key → token name. */
export function loadKeys(file = KEYS_FILE) {
  let keys;
  try {
    keys = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
  if (keys === null || typeof keys !== 'object' || Array.isArray(keys)) {
    throw new Error(`${file}: not an object of keys`);
  }
  return keys;
}

/** The `r,g,b` of an opaque token, or the reason there is none. */
function channelsOf(tokens, name) {
  if (typeof name !== 'string' || name === '') {
    return { problem: 'needs a token name' };
  }
  let rgb;
  try {
    rgb = srgb8(resolveToken(tokens, name).colour);
  } catch (error) {
    return { problem: `${name}: ${error.message}` };
  }
  return rgb.alpha === 1 ? { text: `${rgb.r},${rgb.g},${rgb.b}` } : { problem: `${name} is not opaque` };
}

/**
 * The file `Amber.colorscheme`, from the table and the tokens: one group per
 * colour key with `Color=r,g,b`, groups sorted, then `[General]`. Throws one
 * error listing every problem, one per line, each starting with its key.
 */
export function formatTerminalColours(keys, tokens) {
  const problems = [
    ...COLOUR_KEYS.filter(key => !Object.hasOwn(keys, key)).map(key => `${key}: missing`),
    ...Object.keys(keys).filter(key => !COLOUR_KEYS.includes(key)).map(key => `${key}: unknown key`)
  ];
  const sections = [];
  for (const key of COLOUR_KEYS.filter(key => Object.hasOwn(keys, key))) {
    const { text, problem } = channelsOf(tokens, keys[key]);
    if (problem) {
      problems.push(`${key}: ${problem}`);
    } else {
      sections.push(`[${key}]\nColor=${text}`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`The terminal colours cannot be generated:\n${problems.join('\n')}`);
  }
  return `${[ HEADER.join('\n'), ...sections, [ '[General]', ...GENERAL ].join('\n') ].join('\n\n')}\n`;
}

/** Keys that need no pair: the backgrounds, and ANSI black and its faint variant, which are exempt (D-53). */
const UNPAIRED = /^(Background|Background(Faint|Intense)|Color0|Color0Faint)$/;

/**
 * Each `key: token` of the table, other than those in UNPAIRED, whose token
 * has no contrast pair on the terminal background. Pairs are matched by
 * resolved colour, as the colour scheme's check does, so a pair declared on
 * an alias of the terminal counts.
 */
export function unpairedKeys(keys, tokens, pairs, terminal = 'terminal') {
  const hex = name => {
    try {
      return describeColour(resolveToken(tokens, name).colour).hex;
    } catch {
      return null;
    }
  };
  const background = hex(terminal);
  const paired = new Set(
    pairs.filter(pair => pair.background.length === 1 && hex(pair.background[0]) === background).map(pair => hex(pair.foreground))
  );
  return Object.entries(keys)
    .filter(([ key ]) => !UNPAIRED.test(key))
    .filter(([ , token ]) => !paired.has(hex(token)))
    .map(([ key, token ]) => `${key}: ${token}`);
}
