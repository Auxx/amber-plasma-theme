import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COLOUR_SETS,
  OTHER_ROLES,
  SET_ROLES,
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
