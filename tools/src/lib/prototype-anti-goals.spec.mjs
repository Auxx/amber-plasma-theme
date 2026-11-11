import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The anti-goals, checked in the prototype's own files: no rounded corner, no
 * hairline but the window outline, and no colour that is not a token
 * (docs/product/vision.md, docs/architecture/design-language.md). The tokens
 * file itself is checked by the contrast pairs.
 */

const PROTOTYPE = fileURLToPath(new URL('../../../prototype/', import.meta.url));

/** Replaces each comment with the newlines it spans, so line numbers hold. */
const stripComments = (source, pattern) => source.replace(pattern, comment => comment.replace(/[^\n]/g, ''));

const stylesheets = readdirSync(PROTOTYPE)
  .filter(name => name.endsWith('.css') && name !== 'tokens.css')
  .sort()
  .map(name => ({ name, text: stripComments(readFileSync(join(PROTOTYPE, name), 'utf8'), /\/\*[\s\S]*?\*\//g) }));

const page = stripComments(readFileSync(join(PROTOTYPE, 'index.html'), 'utf8'), /<!--[\s\S]*?-->/g);

/** Every line of every stylesheet, as `{ where, line }`. */
const lines = stylesheets.flatMap(({ name, text }) =>
  text.split('\n').map((line, index) => ({ where: `${name}:${index + 1}`, line: line.trim() }))
);

/** Every `property: value` declaration that fits on one line. */
const declarations = lines.flatMap(({ where, line }) =>
  [ ...line.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*([^;{}]+?)\s*(?=;|}|$)/g) ].map(([ , property, value ]) => ({
    where,
    property,
    value,
    text: line
  }))
);

const offences = list => list.map(({ where, text }) => `${where}: ${text}`);

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|(?<![\w-])(?:black|white|gr[ae]y|silver)(?![\w-])/i;

const BORDER_ALLOWED = [ 'border-radius', 'border-collapse', 'border-spacing' ];

describe('prototype anti-goals', () => {
  it('finds the page and its stylesheets', () => {
    const names = stylesheets.map(s => s.name);
    assert.ok(names.includes('window.css') && names.includes('shell.css'), names.join(', '));
    const links = [ ...page.matchAll(/<link rel="stylesheet" href="([^"]+)">/g) ].map(m => m[1]);
    assert.deepEqual(links, [ 'tokens.css', 'window.css', 'shell.css' ]);
  });

  it('uses no colour but the tokens', () => {
    const found = lines.filter(({ line }) => COLOUR.test(line) && !/^--desktop\s*:/.test(line));
    assert.deepEqual(offences(found.map(l => ({ ...l, text: l.line }))), []);
  });

  it('rounds no corner', () => {
    assert.deepEqual(offences(declarations.filter(d => d.property === 'border-radius' && d.value !== '0')), []);
  });

  it('draws no border', () => {
    const found = declarations.filter(
      d => d.property.startsWith('border') && !BORDER_ALLOWED.includes(d.property) && ![ 'none', '0' ].includes(d.value)
    );
    assert.deepEqual(offences(found), []);
  });

  it('casts no box shadow', () => {
    assert.deepEqual(offences(declarations.filter(d => d.property === 'box-shadow')), []);
  });

  it('draws no outline but the window outline', () => {
    const found = declarations.filter(
      d => d.property === 'outline' && ![ 'none', 'var(--outline-width) solid var(--outline)' ].includes(d.value)
    );
    assert.deepEqual(offences(found), []);
  });

  it('keeps the page plain', () => {
    const found = [ '<script', '<style', '<hr' ].filter(tag => page.toLowerCase().includes(tag));
    const styles = [ ...page.matchAll(/\sstyle="([^"]*)"/g) ]
      .flatMap(([ , style ]) => style.split(';'))
      .map(declaration => declaration.trim())
      .filter(declaration => declaration !== '' && !declaration.startsWith('--'));
    assert.deepEqual([ ...found, ...styles ], []);
  });
});
