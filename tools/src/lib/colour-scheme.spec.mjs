import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COLOUR_SETS,
  OTHER_ROLES,
  SET_ROLES,
  disabledContrastAmount,
  formatColourScheme,
  missingRoles,
  parseRoles,
  uncheckedPairings,
  unknownTokens,
  visibleHoverFrames
} from './colour-scheme.mjs';
import { parsePairs, parseTokens } from './tokens.mjs';

const TOKENS = parseTokens(':root {\n  --a: #000000;\n  --b: #ffffff;\n  --c: var(--a);\n}');

const roles = groups => parseRoles(JSON.stringify(groups));

const pairs = (minimum, on = 'c') =>
  parsePairs(JSON.stringify([ { foreground: 'b', on: [ on ], minimum, why: 'test' } ]));

describe('colour-scheme roles', () => {
  it('knows the roles', () => {
    assert.equal(COLOUR_SETS.length, 8);
    assert.ok(COLOUR_SETS.includes('Colors:Header][Inactive'));
    assert.equal(SET_ROLES.length, 12);
    assert.equal(OTHER_ROLES.WM.length, 6);
  });

  it('reads entries of each kind', () => {
    const parsed = roles({
      'Colors:View': { BackgroundNormal: { token: 'a' } },
      General: { Name: { value: 'Amber', why: 'its name' } },
      'ColorEffects:Disabled': { ContrastAmount: { rule: 'computed by the generator' } }
    });
    assert.deepEqual(parsed.get('Colors:View').get('BackgroundNormal'), { token: 'a' });
    assert.deepEqual(parsed.get('General').get('Name'), { value: 'Amber', why: 'its name' });
    assert.deepEqual(parsed.get('ColorEffects:Disabled').get('ContrastAmount'), { rule: 'computed by the generator' });
  });

  it('refuses what it does not understand', () => {
    assert.throws(() => roles({ 'Colors:Sidebar': {} }), /roles.json: Colors:Sidebar/);
    assert.throws(() => roles({ 'Colors:View': { ForegroundLoud: { token: 'a' } } }), /Colors:View.ForegroundLoud/);
    assert.throws(() => roles({ General: { Name: { token: 'a', value: 1, why: 'x' } } }), /exactly one/);
    assert.throws(() => roles({ General: { Name: {} } }), /exactly one/);
    assert.throws(() => roles({ KDE: { contrast: { value: 0 } } }), /why/);
    assert.throws(() => roles({ 'Colors:View': { BackgroundNormal: { value: '#808080', why: 'x' } } }), /token/);
    assert.throws(() => roles({ 'Colors:View': { BackgroundNormal: { rule: 'x' } } }), /token/);
    assert.throws(() => roles({ 'Colors:View': { BackgroundNormal: { token: '' } } }), /token/);
    assert.throws(() => roles([]), /roles.json: not an object/);
    assert.throws(() => roles({ General: { Name: { value: 'Amber', why: 'x', note: 'y' } } }), /unknown fields: note/);
    assert.throws(() => roles({ General: { Name: { value: null, why: 'x' } } }), /"value" must be/);
    assert.throws(() => roles({ WM: { activeBlend: { value: '#808080', why: 'x' } } }), /WM.activeBlend: a colour role takes a token/);
    assert.throws(() => roles({ 'ColorEffects:Disabled': { Color: { rule: 'x' } } }), /a colour role takes a token/);
    assert.throws(() => parseRoles('{"__proto__": {}}'), /roles.json: __proto__: not a group/);
    assert.throws(() => roles({ toString: {} }), /roles.json: toString: not a group/);
    assert.throws(() => parseRoles('{', 'roles.json'), /^Error: roles.json: /);
  });

  it('lists missing roles', () => {
    const missing = missingRoles(roles({ 'Colors:View': { BackgroundNormal: { token: 'a' } } }));
    assert.equal(missing.length, 122);
    assert.ok(missing.includes('Colors:Header][Inactive.DecorationHover'));
    assert.ok(missing.includes('KDE.frameContrast'));
    assert.ok(!missing.includes('Colors:View.BackgroundNormal'));
  });

  it('names unknown tokens', () => {
    assert.deepEqual(
      unknownTokens(roles({ 'Colors:View': { BackgroundNormal: { token: 'nope' }, ForegroundNormal: { token: 'c' } } }), TOKENS),
      [ 'Colors:View.BackgroundNormal: nope' ]
    );
  });

  it('finds unchecked pairings', () => {
    const view = roles({ 'Colors:View': { BackgroundNormal: { token: 'a' }, ForegroundNormal: { token: 'b' } } });
    assert.deepEqual(uncheckedPairings(view, TOKENS, pairs(4.5)), []);
    assert.deepEqual(uncheckedPairings(view, TOKENS, pairs(3)), [
      'Colors:View.ForegroundNormal (b) on BackgroundNormal (a): no pair of 4.5'
    ]);
  });

  it('asks 3 of the focus decoration', () => {
    const view = roles({ 'Colors:View': { BackgroundAlternate: { token: 'a' }, DecorationFocus: { token: 'b' } } });
    assert.deepEqual(uncheckedPairings(view, TOKENS, pairs(3)), []);
    assert.deepEqual(uncheckedPairings(view, TOKENS, pairs(2)), [
      'Colors:View.DecorationFocus (b) on BackgroundAlternate (a): no pair of 3'
    ]);
  });

  it('counts only pairs with one background layer', () => {
    const view = roles({ 'Colors:View': { BackgroundNormal: { token: 'a' }, ForegroundNormal: { token: 'b' } } });
    const layered = parsePairs(JSON.stringify([ { foreground: 'b', on: [ [ 'a', 'c' ] ], minimum: 4.5, why: 'test' } ]));
    assert.equal(uncheckedPairings(view, TOKENS, layered).length, 1);
  });

  it('finds hover frames', () => {
    const hover = token => roles({ 'Colors:View': { BackgroundNormal: { token: 'a' }, DecorationHover: { token } } });
    assert.deepEqual(visibleHoverFrames(hover('b'), TOKENS), [ 'Colors:View' ]);
    assert.deepEqual(visibleHoverFrames(hover('c'), TOKENS), []);
  });
});

const SCHEME_TOKENS = parseTokens(`:root {
  --text: #e8e3da;
  --text-dim: #a9a297;
  --tone-2: #25221f;
  --accent: #d1b072;
  --glow: color-mix(in srgb, var(--accent) 50%, transparent);
}`);

const COLOUR_KEYS = [ 'ColorEffects:Disabled.Color', 'ColorEffects:Inactive.Color', ...OTHER_ROLES.WM.map(key => `WM.${key}`) ];

/** A table with every role, tone-2 for each colour; `change(groups)` edits it before it is parsed. */
function fullTable(change = () => {}) {
  const groups = {};
  for (const group of COLOUR_SETS) {
    groups[group] = Object.fromEntries(SET_ROLES.map(key => [ key, { token: 'tone-2' } ]));
  }
  for (const [ group, keys ] of Object.entries(OTHER_ROLES)) {
    groups[group] = Object.fromEntries(
      keys.map(key => [ key, COLOUR_KEYS.includes(`${group}.${key}`) ? { token: 'tone-2' } : { value: 0, why: 'test' } ])
    );
  }
  groups['ColorEffects:Disabled'].ContrastAmount = { rule: 'computed' };
  groups.General.Name = { value: 'Amber', why: 'test' };
  groups.General.shadeSortColumn = { value: false, why: 'test' };
  change(groups);
  return roles(groups);
}

const HEADER = [
  '# SPDX-FileCopyrightText: 2026 Aleksandr \'Aux\' Ivanov',
  '# SPDX-License-Identifier: MIT',
  '# Generated from prototype/tokens.css and parts/colour-scheme/roles.json.',
  '# Do not edit: run node tools/src/bin/generate.mjs colour-scheme --write'
];

/** The lines of one group of a generated file. */
const groupLines = (text, group) => {
  const start = text.split('\n').indexOf(`[${group}]`);
  const lines = text.split('\n').slice(start + 1);
  return lines.slice(0, lines.indexOf(''));
};

describe('formatColourScheme', () => {
  it('writes a colour as r,g,b', () => {
    const text = formatColourScheme(fullTable(g => (g['Colors:View'].BackgroundNormal = { token: 'accent' })), SCHEME_TOKENS);
    assert.ok(groupLines(text, 'Colors:View').includes('BackgroundNormal=209,176,114'));
    assert.ok(groupLines(text, 'Colors:Window').includes('BackgroundNormal=37,34,31'));
  });

  it('writes values as KConfig does', () => {
    const text = formatColourScheme(fullTable(), SCHEME_TOKENS);
    assert.deepEqual(groupLines(text, 'General'), [ 'ColorScheme=0', 'Name=Amber', 'shadeSortColumn=false' ]);
    assert.ok(groupLines(text, 'ColorEffects:Disabled').includes('ColorAmount=0'));
  });

  it('computes the disabled contrast amount', () => {
    assert.equal(disabledContrastAmount(SCHEME_TOKENS), 0.34);
    assert.ok(groupLines(formatColourScheme(fullTable(), SCHEME_TOKENS), 'ColorEffects:Disabled').includes('ContrastAmount=0.34'));
  });

  it('sorts groups and keys', () => {
    const text = formatColourScheme(fullTable(), SCHEME_TOKENS);
    assert.deepEqual(text.split('\n').filter(line => line.startsWith('[')), [
      '[ColorEffects:Disabled]',
      '[ColorEffects:Inactive]',
      '[Colors:Button]',
      '[Colors:Complementary]',
      '[Colors:Header]',
      '[Colors:Header][Inactive]',
      '[Colors:Selection]',
      '[Colors:Tooltip]',
      '[Colors:View]',
      '[Colors:Window]',
      '[General]',
      '[KDE]',
      '[WM]'
    ]);
    assert.deepEqual(groupLines(text, 'General').map(line => line.split('=')[0]), [ 'ColorScheme', 'Name', 'shadeSortColumn' ]);
  });

  it('starts with the header and ends with one newline', () => {
    const text = formatColourScheme(fullTable(), SCHEME_TOKENS);
    assert.deepEqual(text.split('\n').slice(0, 5), [ ...HEADER, '' ]);
    assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'));
  });

  it('is the same each time', () => {
    assert.equal(formatColourScheme(fullTable(), SCHEME_TOKENS), formatColourScheme(fullTable(), SCHEME_TOKENS));
  });

  it('refuses a missing role', () => {
    assert.throws(
      () => formatColourScheme(fullTable(g => delete g['Colors:View'].DecorationHover), SCHEME_TOKENS),
      /Colors:View\.DecorationHover/
    );
  });

  it('refuses an unknown token', () => {
    const table = fullTable(g => (g['Colors:View'].BackgroundNormal = { token: 'no-such-token' }));
    assert.throws(() => formatColourScheme(table, SCHEME_TOKENS), /Colors:View\.BackgroundNormal: no-such-token/);
  });

  it('refuses a token that is not opaque', () => {
    const table = fullTable(g => (g['Colors:View'].BackgroundNormal = { token: 'glow' }));
    assert.throws(() => formatColourScheme(table, SCHEME_TOKENS), /Colors:View\.BackgroundNormal: glow is not opaque/);
  });

  it('refuses a rule it cannot compute', () => {
    const table = fullTable(g => (g.KDE.contrast = { rule: 'something' }));
    assert.throws(() => formatColourScheme(table, SCHEME_TOKENS), /KDE\.contrast: no generator for this rule/);
  });

  it('refuses a value that would break the file', () => {
    for (const name of [ 'A\nB', '[A]', '' ]) {
      const table = fullTable(g => (g.General.Name = { value: name, why: 'test' }));
      assert.throws(() => formatColourScheme(table, SCHEME_TOKENS), /General\.Name/);
    }
  });

  it('names every problem at once', () => {
    const table = fullTable(g => {
      g.KDE.contrast = { rule: 'something' };
      g['Colors:View'].BackgroundNormal = { token: 'glow' };
    });
    assert.throws(() => formatColourScheme(table, SCHEME_TOKENS), error =>
      /KDE\.contrast/.test(error.message) && /Colors:View\.BackgroundNormal/.test(error.message));
  });
});
