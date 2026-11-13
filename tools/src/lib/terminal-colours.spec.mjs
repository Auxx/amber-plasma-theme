import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COLOUR_KEYS, formatTerminalColours, loadKeys, unpairedKeys } from './terminal-colours.mjs';
import { loadPairs, loadTokens, parsePairs, parseTokens, resolveToken } from './tokens.mjs';

const TOKENS = parseTokens(`:root {
  --red: #aa5f51;
  --other: #102030;
  --see-through: color-mix(in srgb, var(--red) 50%, transparent);
}`);

/** A complete table with every key on `other`, changed by `changes`; a key set to undefined is left out. */
function table(changes = {}) {
  const keys = Object.fromEntries(COLOUR_KEYS.map(key => [ key, 'other' ]));
  for (const [ key, token ] of Object.entries(changes)) {
    if (token === undefined) {
      delete keys[key];
    } else {
      keys[key] = token;
    }
  }
  return keys;
}

const groupLines = text => text.split('\n').filter(line => line.startsWith('['));

describe('formatTerminalColours', () => {
  it('knows the 30 colour keys', () => {
    assert.equal(COLOUR_KEYS.length, 30);
  });

  it('writes a colour group', () => {
    const lines = formatTerminalColours(table({ Color1: 'red' }), TOKENS).split('\n');
    const at = lines.indexOf('[Color1]');
    assert.ok(at > 0);
    assert.equal(lines[at + 1], 'Color=170,95,81');
  });

  it('sorts the groups', () => {
    const groups = groupLines(formatTerminalColours(table(), TOKENS));
    assert.deepEqual(groups.slice(0, 3), [ '[Background]', '[BackgroundFaint]', '[BackgroundIntense]' ]);
    assert.ok(groups.indexOf('[Color0Faint]') < groups.indexOf('[Color0Intense]'));
    assert.equal(groups.at(-1), '[General]');
    assert.equal(groups.length, 31);
  });

  it('writes the general group', () => {
    const text = formatTerminalColours(table(), TOKENS);
    const general = text.slice(text.indexOf('[General]')).split('\n');
    assert.deepEqual(general, [
      '[General]', 'Blur=false', 'ColorRandomization=false', 'Description=Amber', 'Opacity=1', 'Wallpaper=', ''
    ]);
  });

  it('starts with the header and ends with one newline', () => {
    const text = formatTerminalColours(table(), TOKENS);
    assert.deepEqual(text.split('\n').slice(0, 4), [
      "# SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov",
      '# SPDX-License-Identifier: MIT',
      '# Generated from prototype/tokens.css and parts/terminal-colours/keys.json.',
      '# Do not edit: run node tools/src/bin/generate.mjs terminal-colours --write'
    ]);
    assert.ok(text.endsWith('\n'));
    assert.ok(!text.endsWith('\n\n'));
  });

  it('is the same each time', () => {
    assert.equal(formatTerminalColours(table(), TOKENS), formatTerminalColours(table(), TOKENS));
  });

  it('refuses a missing key', () => {
    assert.throws(() => formatTerminalColours(table({ Color3Intense: undefined }), TOKENS), /Color3Intense: missing/);
  });

  it('refuses an unknown key', () => {
    assert.throws(() => formatTerminalColours(table({ Color8: 'other' }), TOKENS), /Color8: unknown key/);
  });

  it('refuses an unknown token', () => {
    assert.throws(() => formatTerminalColours(table({ Background: 'no-such-token' }), TOKENS), /Background: no-such-token/);
  });

  it('refuses a token that is not opaque', () => {
    assert.throws(() => formatTerminalColours(table({ Color1: 'see-through' }), TOKENS), /Color1: see-through is not opaque/);
  });

  it('names every problem at once', () => {
    assert.throws(
      () => formatTerminalColours(table({ Color8: 'other', Background: 'nope' }), TOKENS),
      error => /Color8/.test(error.message) && /Background: nope/.test(error.message)
    );
  });
});

describe('unpairedKeys', () => {
  const tokens = parseTokens(':root {\n  --bg: #1c1a18;\n  --alias: var(--bg);\n  --fg: #e8e3da;\n  --odd: #808080;\n}');
  const pairs = parsePairs(JSON.stringify([ { foreground: 'fg', on: [ 'alias' ], minimum: 4.5, why: 'test' } ]));
  const keys = changes => ({ ...table(), Background: 'bg', ...changes });

  it('counts a pair by resolved colour, so an alias of the terminal counts', () => {
    assert.deepEqual(unpairedKeys(keys({ Foreground: 'fg' }), tokens, pairs, 'bg').filter(k => k.startsWith('Foreground:')), []);
  });

  it('names a key whose token has no pair, bright black among them', () => {
    const found = unpairedKeys(keys({ Color0Intense: 'odd', Color1: 'odd' }), tokens, pairs, 'bg');
    assert.ok(found.includes('Color0Intense: odd'), found.join(', '));
    assert.ok(found.includes('Color1: odd'), found.join(', '));
  });

  it('exempts ANSI black, its faint variant and the backgrounds', () => {
    const found = unpairedKeys(keys({ Color0: 'odd', Color0Faint: 'odd', BackgroundFaint: 'odd' }), tokens, pairs, 'bg');
    assert.ok(!found.some(k => /^(Color0|Color0Faint|BackgroundFaint):/.test(k)), found.join(', '));
  });
});

describe('keys.json', () => {
  it('every key has a pair on the terminal', () => {
    assert.deepEqual(unpairedKeys(loadKeys(), loadTokens(), loadPairs()), []);
  });
});
