import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { relativeLuminance, srgb8 } from './colour.mjs';
import { resolveToken } from './tokens.mjs';

/**
 * The roles of Amber's colour scheme (docs/architecture/colour-scheme.md):
 * which groups and keys a `.colors` file has, and the table in
 * parts/colour-scheme/roles.json that gives each one a token, a value or a
 * written rule.
 *
 * The groups and keys were verified on 2026-11-12 against kf6-kcolorscheme
 * 6.31.0 (the strings of libKF6ColorScheme.so.6) and the BreezeDark.colors of
 * plasma-workspace 6.8.2. `KDE.frameContrast` is in the library's strings but
 * in no file on the machine; its group is unverified.
 */

/** The table of roles, read by the generator. */
export const ROLES_FILE = fileURLToPath(new URL('../../../parts/colour-scheme/roles.json', import.meta.url));

/** The colour sets, as their groups are written in a `.colors` file. */
export const COLOUR_SETS = [
  'Colors:View',
  'Colors:Window',
  'Colors:Button',
  'Colors:Selection',
  'Colors:Tooltip',
  'Colors:Complementary',
  'Colors:Header',
  'Colors:Header][Inactive'
];

/** The roles of every colour set. */
export const SET_ROLES = [
  'BackgroundNormal',
  'BackgroundAlternate',
  'ForegroundNormal',
  'ForegroundInactive',
  'ForegroundActive',
  'ForegroundLink',
  'ForegroundVisited',
  'ForegroundNegative',
  'ForegroundNeutral',
  'ForegroundPositive',
  'DecorationFocus',
  'DecorationHover'
];

/** The roles of the groups that are not colour sets. */
export const OTHER_ROLES = {
  'ColorEffects:Disabled': [ 'Color', 'ColorAmount', 'ColorEffect', 'ContrastAmount', 'ContrastEffect', 'IntensityAmount', 'IntensityEffect' ],
  'ColorEffects:Inactive': [
    'ChangeSelectionColor', 'Color', 'ColorAmount', 'ColorEffect', 'ContrastAmount', 'ContrastEffect', 'Enable', 'IntensityAmount', 'IntensityEffect'
  ],
  General: [ 'ColorScheme', 'Name', 'shadeSortColumn' ],
  KDE: [ 'contrast', 'frameContrast' ],
  WM: [ 'activeBackground', 'activeBlend', 'activeForeground', 'inactiveBackground', 'inactiveBlend', 'inactiveForeground' ]
};

/**
 * The roles outside the colour sets that hold a colour. Like a colour set,
 * they take tokens only, so that no literal colour can bring back a grey.
 */
export const COLOUR_ROLES = [
  'ColorEffects:Disabled.Color',
  'ColorEffects:Inactive.Color',
  ...OTHER_ROLES.WM.map(key => `WM.${key}`)
];

const KINDS = [ 'token', 'value', 'rule' ];

/** The keys of a group, or undefined for a group a `.colors` file does not have. */
const rolesOf = group => {
  if (COLOUR_SETS.includes(group)) {
    return SET_ROLES;
  }
  return Object.hasOwn(OTHER_ROLES, group) ? OTHER_ROLES[group] : undefined;
};

const isText = value => typeof value === 'string' && value.trim() !== '';
const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Parses the table: an object of groups, each an object of roles, each an
 * entry with exactly one of `token`, `value` or `rule`, and a `why`. A value
 * needs a `why`; a colour set and a colour role take tokens only. Throws on anything else.
 */
export function parseRoles(source, file = 'roles.json') {
  let groups;
  try {
    groups = JSON.parse(source);
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
  if (!isPlainObject(groups)) {
    throw new Error(`${file}: not an object of groups`);
  }
  const roles = new Map();
  for (const [ group, entries ] of Object.entries(groups)) {
    const known = rolesOf(group);
    if (!known) {
      throw new Error(`${file}: ${group}: not a group of a .colors file`);
    }
    if (!isPlainObject(entries)) {
      throw new Error(`${file}: ${group}: not an object of roles`);
    }
    const parsed = new Map();
    for (const [ key, entry ] of Object.entries(entries)) {
      const fail = message => {
        throw new Error(`${file}: ${group}.${key}: ${message}`);
      };
      if (!known.includes(key)) {
        fail(`not a role of ${group}`);
      }
      if (!isPlainObject(entry)) {
        fail('not an object');
      }
      const kinds = KINDS.filter(kind => kind in entry);
      if (kinds.length !== 1) {
        fail('needs exactly one of "token", "value" and "rule"');
      }
      const [ kind ] = kinds;
      if (COLOUR_SETS.includes(group) && kind !== 'token') {
        fail('a colour set takes a token');
      }
      if (COLOUR_ROLES.includes(`${group}.${key}`) && kind !== 'token') {
        fail('a colour role takes a token');
      }
      if ((kind === 'token' || kind === 'rule') && !isText(entry[kind])) {
        fail(`"${kind}" must be a non-empty string`);
      }
      if (kind === 'value' && ![ 'string', 'number', 'boolean' ].includes(typeof entry.value)) {
        fail('"value" must be a string, a number or a boolean');
      }
      if ('why' in entry && !isText(entry.why)) {
        fail('"why" must be a non-empty string');
      }
      if (kind === 'value' && !('why' in entry)) {
        fail('a value needs a "why"');
      }
      const extra = Object.keys(entry).filter(name => name !== kind && name !== 'why');
      if (extra.length > 0) {
        fail(`unknown fields: ${extra.join(', ')}`);
      }
      parsed.set(key, entry);
    }
    roles.set(group, parsed);
  }
  return roles;
}

/** Reads the table. */
export function loadRoles(file = ROLES_FILE) {
  return parseRoles(readFileSync(file, 'utf8'), file);
}

/** Every group and key a `.colors` file has, as `group.key`. */
function allRoles() {
  const groups = [ ...COLOUR_SETS.map(group => [ group, SET_ROLES ]), ...Object.entries(OTHER_ROLES) ];
  return groups.flatMap(([ group, keys ]) => keys.map(key => [ group, key ]));
}

/** Each `group.key` that has no entry. */
export function missingRoles(roles) {
  return allRoles()
    .filter(([ group, key ]) => !roles.get(group)?.has(key))
    .map(([ group, key ]) => `${group}.${key}`);
}

/** Resolves a token to its 8-bit sRGB hex, or null when it cannot be resolved. */
function hexOf(tokens, name) {
  try {
    const { r, g, b, alpha } = srgb8(resolveToken(tokens, name).colour);
    const hex = [ r, g, b ].map(channel => channel.toString(16).padStart(2, '0')).join('');
    return alpha === 1 ? `#${hex}` : `#${hex}/${alpha}`;
  } catch {
    return null;
  }
}

/** `group.key: token` for each token entry whose token cannot be resolved. */
export function unknownTokens(roles, tokens) {
  const unknown = [];
  for (const [ group, entries ] of roles) {
    for (const [ key, entry ] of entries) {
      if ('token' in entry && hexOf(tokens, entry.token) === null) {
        unknown.push(`${group}.${key}: ${entry.token}`);
      }
    }
  }
  return unknown;
}

const BACKGROUNDS = [ 'BackgroundNormal', 'BackgroundAlternate' ];

/** The minimum each foreground role of a colour set must have a pair for. */
const MINIMUMS = [
  ...SET_ROLES.filter(key => key.startsWith('Foreground')).map(key => [ key, 4.5 ]),
  [ 'DecorationFocus', 3 ]
];

/**
 * Each pairing a colour set makes, a foreground role on one of its
 * backgrounds, that no declared pair covers. A pair covers it when it has one
 * background layer, its colours resolve to the same colours, and its minimum
 * is at least the role's. Roles that are missing or whose tokens cannot be
 * resolved are left to `missingRoles` and `unknownTokens`.
 */
export function uncheckedPairings(roles, tokens, pairs) {
  const declared = pairs
    .filter(pair => pair.background.length === 1)
    .map(pair => ({ foreground: hexOf(tokens, pair.foreground), background: hexOf(tokens, pair.background[0]), minimum: pair.minimum }));
  const unchecked = [];
  for (const group of COLOUR_SETS) {
    const entries = roles.get(group);
    if (!entries) {
      continue;
    }
    for (const [ key, minimum ] of MINIMUMS) {
      const foreground = entries.get(key)?.token;
      for (const backgroundKey of BACKGROUNDS) {
        const background = entries.get(backgroundKey)?.token;
        const fg = foreground && hexOf(tokens, foreground);
        const bg = background && hexOf(tokens, background);
        if (!fg || !bg) {
          continue;
        }
        const covered = declared.some(pair => pair.foreground === fg && pair.background === bg && pair.minimum >= minimum);
        if (!covered) {
          unchecked.push(`${group}.${key} (${foreground}) on ${backgroundKey} (${background}): no pair of ${minimum}`);
        }
      }
    }
  }
  return unchecked;
}

/** Each colour set whose hover decoration differs from its background, so that a hover frame would show (D-4). */
export function visibleHoverFrames(roles, tokens) {
  return COLOUR_SETS.filter(group => {
    const entries = roles.get(group);
    const hover = entries?.get('DecorationHover')?.token;
    const background = entries?.get('BackgroundNormal')?.token;
    return hover && background && hexOf(tokens, hover) !== hexOf(tokens, background);
  });
}

/** The 8-bit sRGB channels of an opaque token, or the reason it has none. */
function channelsOf(tokens, name) {
  let rgb;
  try {
    rgb = srgb8(resolveToken(tokens, name).colour);
  } catch (error) {
    return { problem: `${name}: ${error.message}` };
  }
  return rgb.alpha === 1 ? { rgb: [ rgb.r, rgb.g, rgb.b ] } : { problem: `${name} is not opaque` };
}

/** Relative luminance of channels that need not be whole numbers. */
const luminance = ([ r, g, b ]) => relativeLuminance({ r, g, b });

/**
 * The disabled `ContrastAmount` (the table's rule): the amount, rounded to two
 * places, at which `text` faded towards `tone-2` has the relative luminance of
 * `text-dim`. Fading mixes the sRGB channels, `fg + (bg - fg) * a`, as
 * KColorUtils::mix does (unverified; checked by eye in P2.3).
 */
export function disabledContrastAmount(tokens) {
  const [ text, background, dim ] = [ 'text', 'tone-2', 'text-dim' ].map(name => {
    const { rgb, problem } = channelsOf(tokens, name);
    if (problem) {
      throw new Error(problem);
    }
    return rgb;
  });
  const target = luminance(dim);
  const fade = amount => luminance(text.map((channel, i) => channel + (background[i] - channel) * amount));
  const darkens = fade(1) < fade(0);
  let [ low, high ] = [ 0, 1 ];
  for (let round = 0; round < 50; round++) {
    const middle = (low + high) / 2;
    if (fade(middle) > target === darkens) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return Math.round(((low + high) / 2) * 100) / 100;
}

/** The roles whose `rule` the generator computes, by `group.key`. */
const RULES = {
  'ColorEffects:Disabled.ContrastAmount': disabledContrastAmount
};

/** The header of the generated file. */
const HEADER = [
  "# SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov",
  '# SPDX-License-Identifier: MIT',
  '# Generated from prototype/tokens.css and parts/colour-scheme/roles.json.',
  '# Do not edit: run node tools/src/bin/generate.mjs colour-scheme --write'
];

/** A value as KConfig writes it, or the reason it cannot be written. */
function formatValue(value) {
  if (typeof value === 'string' && (value === '' || /[\n\r[\]]/.test(value))) {
    return { problem: `${JSON.stringify(value)} cannot be written in a .colors file` };
  }
  return { text: String(value) };
}

/**
 * The colour scheme file, `Amber.colors`, from the table and the tokens:
 * groups and keys sorted as KConfig sorts them, colours as `r,g,b`. Throws
 * one error listing every problem, one per line, each starting `group.key:`.
 */
export function formatColourScheme(roles, tokens) {
  const problems = missingRoles(roles).map(role => `${role}: missing`);
  const sections = [];
  for (const group of [ ...roles.keys() ].sort()) {
    const lines = [ `[${group}]` ];
    const entries = roles.get(group);
    for (const key of [ ...entries.keys() ].sort()) {
      const role = `${group}.${key}`;
      const entry = entries.get(key);
      let result;
      if ('token' in entry) {
        const { rgb, problem } = channelsOf(tokens, entry.token);
        result = problem ? { problem } : { text: rgb.join(',') };
      } else if ('rule' in entry) {
        const rule = RULES[role];
        try {
          result = rule ? { text: String(rule(tokens)) } : { problem: 'no generator for this rule' };
        } catch (error) {
          result = { problem: error.message };
        }
      } else {
        result = formatValue(entry.value);
      }
      if (result.problem) {
        problems.push(`${role}: ${result.problem}`);
      } else {
        lines.push(`${key}=${result.text}`);
      }
    }
    sections.push(lines.join('\n'));
  }
  if (problems.length > 0) {
    throw new Error(`The colour scheme cannot be generated:\n${problems.join('\n')}`);
  }
  return `${[ HEADER.join('\n'), ...sections ].join('\n\n')}\n`;
}
