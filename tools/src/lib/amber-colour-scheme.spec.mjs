import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  COLOUR_SETS,
  OTHER_ROLES,
  SET_ROLES,
  loadRoles,
  missingRoles,
  uncheckedPairings,
  unknownTokens,
  visibleHoverFrames
} from './colour-scheme.mjs';
import { loadPairs, loadTokens } from './tokens.mjs';

/**
 * Amber's colour-scheme roles (roadmap P2.1), read from
 * parts/colour-scheme/roles.json: every role has a token or a written rule,
 * every pairing the scheme makes is a declared contrast pair, and no hover
 * frame shows (docs/architecture/colour-scheme.md).
 */

const BREEZE_DARK = '/usr/share/color-schemes/BreezeDark.colors';

/** The groups and keys of a `.colors` file, leaving out translated names. */
function groupsOf(source) {
  const groups = new Map();
  let current = null;
  for (const line of source.split('\n')) {
    const group = line.match(/^\[(.+)\]\s*$/);
    if (group) {
      current = group[1];
      groups.set(current, []);
    } else if (current && /^[^=[\s]+=/.test(line)) {
      groups.get(current).push(line.slice(0, line.indexOf('=')));
    }
  }
  return groups;
}

describe('Amber colour scheme roles', () => {
  const roles = loadRoles();
  const tokens = loadTokens();

  it('covers every role', () => {
    assert.deepEqual(missingRoles(roles), []);
  });

  it('uses only known tokens', () => {
    assert.deepEqual(unknownTokens(roles, tokens), []);
  });

  it('pairs every foreground with its backgrounds', () => {
    assert.deepEqual(uncheckedPairings(roles, tokens, loadPairs()), []);
  });

  it('draws no hover frame', () => {
    assert.deepEqual(visibleHoverFrames(roles, tokens), []);
  });

  it('knows every role of Breeze Dark', t => {
    if (!existsSync(BREEZE_DARK)) {
      t.skip(`${BREEZE_DARK} not found`);
      return;
    }
    const unknown = [];
    for (const [ group, keys ] of groupsOf(readFileSync(BREEZE_DARK, 'utf8'))) {
      const known = COLOUR_SETS.includes(group) ? SET_ROLES : OTHER_ROLES[group];
      if (!known) {
        unknown.push(group);
        continue;
      }
      unknown.push(...keys.filter(key => !known.includes(key)).map(key => `${group}.${key}`));
    }
    assert.deepEqual(unknown, []);
  });
});
