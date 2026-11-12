import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PARTS } from './generate.mjs';
import { UNION_TOKENS } from './union-tokens.mjs';

/**
 * The Union style (roadmap P3.1): a copy of KDE's Breeze style in
 * parts/union-style/amber/. Union takes the identifier from the folder's
 * name. These checks keep the folder installable while later plans edit it:
 * a broken @import or url() is not reported by Union, and a missing image
 * can abort a Qt Widgets application.
 */

const STYLE = fileURLToPath(new URL('../../../parts/union-style/amber/', import.meta.url));
const CSS = join(STYLE, 'contents/css');

const cssFiles = () => (existsSync(CSS) ? readdirSync(CSS).filter((f) => f.endsWith('.css')) : []);
const read = (file) => readFileSync(join(CSS, file), 'utf8');
const imports = (text) => [...text.matchAll(/@import\s+(?:url\(\s*)?(['"])([^'"]+)\1/g)].map((m) => m[2]);
const urls = (text) => [...text.matchAll(/url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g)].map((m) => m[2]);

describe('the path readers of this spec', () => {
  it('read every quoting of @import and url()', () => {
    const text = `@import "a.css"; @import 'b.css'; @import url("c.css");
      x { background-image: url("../images/d.svg"); }
      y { background-image: url('../images/e.svg'); }
      z { background-image: url(../images/f.svg); }`;
    assert.deepEqual(imports(text), ['a.css', 'b.css', 'c.css']);
    assert.deepEqual(urls(text).filter((u) => u.endsWith('.svg')), ['../images/d.svg', '../images/e.svg', '../images/f.svg']);
  });
});

describe('the Union style folder', () => {
  it('has metadata naming it Amber', () => {
    const meta = JSON.parse(readFileSync(join(STYLE, 'metadata.json'), 'utf8'));
    assert.equal(meta.name, 'Amber');
    assert.equal(meta['input-type'], 'css');
    assert.ok(typeof meta.version === 'string' && meta.version.length > 0, 'version');
    assert.ok(typeof meta.license === 'string' && meta.license.length > 0, 'license');
    assert.equal('hidden' in meta, false, 'the style must not be hidden');
  });

  it('has style.css and resolves every @import', () => {
    assert.ok(existsSync(join(CSS, 'style.css')), 'contents/css/style.css');
    for (const file of cssFiles()) {
      for (const target of imports(read(file))) {
        assert.ok(existsSync(join(CSS, target)), `${file} imports ${target}, which does not exist`);
      }
    }
  });

  it('resolves every url() from contents/css/', () => {
    let found = 0;
    for (const file of cssFiles()) {
      for (const target of urls(read(file))) {
        found += 1;
        assert.ok(existsSync(resolve(CSS, target)), `${file} loads ${target}, which does not exist`);
      }
    }
    assert.ok(found > 0, 'no url() found: the reader is broken');
  });

  it('keeps an SPDX header on every CSS file', () => {
    assert.ok(cssFiles().length > 0, 'no CSS files');
    for (const file of cssFiles()) {
      const head = read(file).match(/^\s*\/\*[\s\S]*?\*\//);
      assert.ok(head && head[0].includes('SPDX-License-Identifier:'), `${file} has no SPDX header`);
    }
  });

  it('carries the BSD 2-Clause licence of the Breeze style', () => {
    const licence = readFileSync(join(STYLE, 'LICENSE'), 'utf8');
    assert.match(licence, /BSD 2-Clause/);
    assert.match(licence, /Arjen Hiemstra/);
  });
});

describe('the Union style\'s tokens (P3.2)', () => {
  it('are generated and not stale (D-92)', () => {
    assert.equal(read('tokens.css'), PARTS['union-style-tokens'].generate());
  });

  it('are imported by style.css directly after variables.css', () => {
    const order = imports(read('style.css'));
    assert.equal(order[order.indexOf('variables.css') + 1], 'tokens.css');
  });

  it('use names that no other file of the style declares', () => {
    for (const file of cssFiles().filter(f => f !== 'tokens.css')) {
      for (const name of UNION_TOKENS) {
        assert.doesNotMatch(read(file), new RegExp(`--${name}\\s*:`), `${file} declares --${name}`);
      }
    }
  });
});

/**
 * Every block of a Union CSS text, at every depth of `&` nesting, with the
 * declarations directly inside it. Each declaration keeps its line and the
 * text of a comment on that line.
 */
function blocks(source) {
  const comments = new Map();
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (comment, at) => {
    if (!comment.includes('\n')) {
      comments.set(source.slice(0, at).split('\n').length, comment.slice(2, -2).trim());
    }
    return comment.replace(/[^\n]/g, ' ');
  });
  const found = [];
  const stack = [];
  let buffer = '';
  let line = 1;
  let start = 1;
  const declare = () => {
    const body = buffer.trim();
    if (body && stack.length) {
      const colon = body.indexOf(':');
      stack.at(-1).declarations.push({
        property: body.slice(0, colon).trim(),
        value: body.slice(colon + 1).trim(),
        line: start,
        comment: comments.get(start) ?? ''
      });
    }
    buffer = '';
  };
  for (const char of text) {
    if (char === '\n') {
      line++;
    }
    if (char === '{') {
      const block = { selector: buffer.trim(), declarations: [] };
      found.push(block);
      stack.push(block);
      buffer = '';
    } else if (char === ';') {
      declare();
    } else if (char === '}') {
      declare();
      stack.pop();
    } else {
      if (!buffer.trim() && char.trim()) {
        start = line;
      }
      buffer += char;
    }
  }
  return found;
}

describe('the block reader of this spec', () => {
  it('reads declarations at every depth of nesting, with their comments', () => {
    const found = blocks('a {\n  x: 1;\n  &:hovered { x: 2; }\n  .inactive & {\n    y: 3; /* round widget */\n  }\n}\n');
    assert.deepEqual(found.map(b => [ b.selector, b.declarations.map(d => `${d.property}=${d.value}`) ]), [
      [ 'a', [ 'x=1' ] ],
      [ '&:hovered', [ 'x=2' ] ],
      [ '.inactive &', [ 'y=3' ] ]
    ]);
    assert.equal(found[2].declarations[0].line, 5);
    assert.equal(found[2].declarations[0].comment, 'round widget');
  });
});

describe('the Union style\'s global rules (P3.2)', () => {
  const rules = cssFiles()
    .filter(f => f !== 'tokens.css')
    .flatMap(file => blocks(read(file)).flatMap(block =>
      block.declarations.map(d => ({ ...d, file, block, where: `${file}:${d.line} ${d.property}: ${d.value}` }))));
  const offending = (test) => rules.filter(test).map(d => d.where);
  const zero = value => /^(0|0px)$/.test(value);

  it('sets --corner-radius to 0px', () => {
    assert.deepEqual(rules.filter(d => d.file === 'variables.css' && d.property === '--corner-radius').map(d => d.value), [ '0px' ]);
  });

  it('gives every corner a radius of zero, except a round widget', () => {
    assert.deepEqual(offending(d => /^border(-(top|bottom)-(left|right))?-radius$/.test(d.property)
      && !zero(d.value) && d.value !== 'var(--corner-radius)' && !d.comment.startsWith('round widget')), []);
  });

  it('marks exactly the five round widgets', () => {
    assert.deepEqual(rules.filter(d => d.comment.startsWith('round widget')).map(d => d.file).sort(),
      [ 'application.css', 'bars.css', 'button.css', 'check.css', 'tables.css' ]);
  });

  it('draws no border', () => {
    assert.deepEqual(offending(d => /^border(-(top|right|bottom|left))?$/.test(d.property) && d.value !== 'none' && !zero(d.value)), []);
    assert.deepEqual(offending(d => /^border(-(top|right|bottom|left))?-width$/.test(d.property) && !zero(d.value)), []);
  });

  it('draws no outline', () => {
    assert.deepEqual(offending(d => d.property === 'outline' && d.value !== 'none'), []);
  });

  it('casts a shadow only from a popup', () => {
    assert.deepEqual(offending(d => d.property === 'box-shadow' && d.file !== 'popup.css' && d.value !== 'none'), []);
    assert.deepEqual(offending(d => d.property === '--button-shadow' && d.value !== 'none'), []);
  });

  it('fills no separator one pixel thick', () => {
    assert.deepEqual(rules.filter(d => d.property === 'background-color'
      && d.block.declarations.some(o => /^(width|height)$/.test(o.property) && o.value === '1px')).map(d => d.where), []);
  });
});
