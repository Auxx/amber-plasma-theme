import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EDITOR_COLOURS, HIDDEN, TEXT_STYLES, formatEditorTheme, loadStyles, unpairedStyles } from './editor-theme.mjs';
import { loadPairs, loadTokens, parsePairs, parseTokens, resolveToken } from './tokens.mjs';
import { describeColour } from './colour.mjs';

const TOKENS = parseTokens(`:root {
  --pink: #d79bb7;
  --bg: #2c2a26;
  --other: #102030;
  --see-through: color-mix(in srgb, var(--pink) 50%, transparent);
}`);

/**
 * A complete table with every key on `other`, changed by `changes`, given as
 * `{ 'text-styles.Keyword': 'pink' }`; a key set to undefined is left out.
 */
function table(changes = {}) {
  const styles = {
    'text-styles': Object.fromEntries(TEXT_STYLES.map(key => [ key, 'other' ])),
    'editor-colors': Object.fromEntries(EDITOR_COLOURS.map(key => [ key, 'other' ]))
  };
  for (const [ path, token ] of Object.entries(changes)) {
    const [ group, key ] = path.split('.');
    if (token === undefined) {
      delete styles[group][key];
    } else {
      styles[group][key] = token;
    }
  }
  return styles;
}

const theme = (changes, tokens = TOKENS) => JSON.parse(formatEditorTheme(table(changes), tokens));

describe('formatEditorTheme', () => {
  it('knows the 31 text styles and 28 editor colours', () => {
    assert.equal(TEXT_STYLES.length, 31);
    assert.equal(EDITOR_COLOURS.length, 28);
  });

  it('writes a text style', () => {
    assert.deepEqual(theme({ 'text-styles.Keyword': 'pink' })['text-styles'].Keyword, {
      'text-color': '#d79bb7',
      'selected-text-color': '#d79bb7',
      bold: false,
      italic: false,
      underline: false,
      'strike-through': false
    });
  });

  it('writes an editor colour', () => {
    assert.equal(theme({ 'editor-colors.BackgroundColor': 'bg' })['editor-colors'].BackgroundColor, '#2c2a26');
  });

  it('keeps the key order', () => {
    const parsed = theme();
    assert.deepEqual(Object.keys(parsed), [ 'metadata', 'text-styles', 'editor-colors', 'custom-styles' ]);
    assert.deepEqual(Object.keys(parsed['text-styles']), TEXT_STYLES);
    assert.deepEqual(Object.keys(parsed['editor-colors']), EDITOR_COLOURS);
    assert.deepEqual(parsed['custom-styles'], {});
  });

  it('writes the metadata', () => {
    const { metadata } = theme();
    assert.equal(metadata.name, 'Amber');
    assert.equal(metadata.revision, 1);
    assert.equal(metadata.license, 'SPDX-License-Identifier: MIT');
    assert.deepEqual(metadata.copyright, [ "SPDX-FileCopyrightText: 2026 Aleksandr 'Aux' Ivanov" ]);
  });

  it('ends with one newline', () => {
    const text = formatEditorTheme(table(), TOKENS);
    assert.ok(text.endsWith('}\n'));
    assert.ok(text.startsWith('{\n    "metadata"'));
  });

  it('is the same each time', () => {
    assert.equal(formatEditorTheme(table(), TOKENS), formatEditorTheme(table(), TOKENS));
  });

  it('refuses a missing key', () => {
    assert.throws(() => theme({ 'text-styles.Float': undefined }), /text-styles\.Float: missing/);
  });

  it('refuses an unknown key', () => {
    assert.throws(() => theme({ 'editor-colors.Minimap': 'other' }), /editor-colors\.Minimap: unknown key/);
  });

  it('refuses an unknown group', () => {
    assert.throws(() => formatEditorTheme({ ...table(), 'custom-styles': {} }, TOKENS), /custom-styles: unknown group/);
  });

  it('refuses an unknown token', () => {
    assert.throws(() => theme({ 'editor-colors.BackgroundColor': 'no-such-token' }), /editor-colors\.BackgroundColor: no-such-token/);
  });

  it('refuses a token that is not opaque', () => {
    assert.throws(() => theme({ 'text-styles.Normal': 'see-through' }), /text-styles\.Normal: see-through is not opaque/);
  });

  it('names every problem at once', () => {
    assert.throws(
      () => theme({ 'editor-colors.Minimap': 'other', 'text-styles.Normal': 'nope' }),
      error => /Minimap/.test(error.message) && /text-styles\.Normal: nope/.test(error.message)
    );
  });
});

describe('unpairedStyles', () => {
  const pairs = parsePairs(JSON.stringify([
    { foreground: 'pink', on: [ 'editor', 'editor-current-line', 'editor-selection', 'editor-search' ], minimum: 4.5, why: 'test' },
    { foreground: 'other', on: [ 'editor-gutter' ], minimum: 3, why: 'test' }
  ]));

  it('names a text style whose token lacks a background', () => {
    const found = unpairedStyles(table({ 'text-styles.Keyword': 'pink', 'text-styles.Normal': 'bg' }), pairs);
    assert.ok(found.includes('text-styles.Normal: bg on editor'), found.join(', '));
    assert.ok(!found.some(line => line.startsWith('text-styles.Keyword')), found.join(', '));
  });

  it('names a gutter key whose token has no pair on the gutter', () => {
    const found = unpairedStyles(table({ 'editor-colors.MarkError': 'pink' }), pairs);
    assert.ok(found.includes('editor-colors.MarkError: pink on editor-gutter'), found.join(', '));
  });
});

describe('styles.json', () => {
  const styles = loadStyles();
  const tokens = loadTokens();

  it('every token has its pairs', () => {
    assert.deepEqual(unpairedStyles(styles, loadPairs()), []);
  });

  it('hides the hairlines', () => {
    const hex = key => describeColour(resolveToken(tokens, styles['editor-colors'][key]).colour).hex;
    const shown = Object.entries(HIDDEN)
      .filter(([ key, surface ]) => hex(key) !== hex(surface))
      .map(([ key, surface ]) => `${key} is ${hex(key)}, ${surface} is ${hex(surface)}`);
    assert.deepEqual(shown, []);
  });
});
