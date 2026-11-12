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
      const parent = stack.at(-1) ?? null;
      const block = { selector: buffer.trim(), declarations: [], parent, children: [] };
      parent?.children.push(block);
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
    assert.equal(found[1].parent, found[0]);
    assert.deepEqual(found[0].children, [ found[1], found[2] ]);
  });
});

const parts = selector => selector.split(',').map(p => p.trim()).filter(Boolean);
/** `&.x`, `&[a]`, `&:state`: the same element, narrowed; not `x &` or `& > y`. */
const refines = selector => parts(selector).every(p => /^&[.[:][^\s>]*$/.test(p));
const thinProperties = block => block.declarations
  .filter(d => /^(width|height)$/.test(d.property) && /^(1|2)px$/.test(d.value)).map(d => d.property);
const setsThin = block => thinProperties(block).length > 0;
/** The block and the refinements below it: the same element in narrower states. */
const sameElement = block => [ block, ...block.children.filter(c => refines(c.selector)).flatMap(sameElement) ];

/**
 * Whether a block draws on an element one or two pixels thick: the thickness
 * may be set in the block or a refinement below it, in an enclosing block
 * (unless the block sets that dimension itself), in a sibling
 * that names one of its selectors, or, for a block that is not a refinement
 * such as `toolbar.header &`, in a refinement of its parent such as
 * `&.horizontal`.
 */
function thin(block) {
  if (sameElement(block).some(setsThin)) {
    return true;
  }
  const own = new Set(block.declarations.map(d => d.property));
  for (let b = block.parent; b; b = b.parent) {
    if (thinProperties(b).some(property => !own.has(property))) {
      return true;
    }
  }
  const siblings = block.parent ? block.parent.children.filter(c => c !== block) : [];
  const mine = new Set(parts(block.selector));
  if (siblings.some(s => parts(s.selector).some(p => mine.has(p)) && setsThin(s))) {
    return true;
  }
  return !refines(block.selector) && siblings.some(s => refines(s.selector) && setsThin(s));
}

describe('the thickness reader of this spec', () => {
  const sample = blocks(`a {
    &[shape="line"], &[shape="other"] { background-color: red; }
    &[shape="line"] { width: 1px; }
    &[shape="box"] { background-color: blue; }
  }
  b {
    &.horizontal { height: 1px; }
    toolbar.header & { background-color: red; }
  }
  c {
    background-color: green;
    & > separator { width: 1px; }
  }
  d {
    height: 1px;
    &.with-title { height: 24px; background-color: red; }
  }`);
  const named = selector => sample.find(b => b.selector === selector);

  it('finds a thickness set in a sibling that names the same selector', () => {
    assert.equal(thin(named('&[shape="line"], &[shape="other"]')), true);
  });

  it('finds a thickness set in a refinement of the parent of a context block', () => {
    assert.equal(thin(named('toolbar.header &')), true);
  });

  it('does not borrow the thickness of a sibling refinement for another refinement', () => {
    assert.equal(thin(named('&[shape="box"]')), false);
  });

  it('does not take a child element\'s thickness for its parent\'s', () => {
    assert.equal(thin(named('c')), false);
  });

  it('lets a refinement that sets its own height override its parent\'s', () => {
    assert.equal(thin(named('&.with-title')), false);
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

  it('fills no separator one or two pixels thick, wherever its thickness is set', () => {
    assert.deepEqual(rules.filter(d => d.property === 'background-color' && thin(d.block)).map(d => d.where), []);
  });
});

describe('the Union style\'s buttons (P3.3)', () => {
  const all = blocks(read('button.css'));
  const chain = block => (block ? [ block, ...chain(block.parent) ] : []);
  const BUTTON = /(^|[\s,>(])(button|toolbutton|combobox|roundbutton|delaybutton)(?![\w-])/;
  const OTHER = /\.editable|\.changed|popup\.combobox/;
  const isButton = block => chain(block).some(b => BUTTON.test(b.selector)) && !chain(block).some(b => OTHER.test(b.selector));
  const top = test => {
    const found = all.filter(b => !b.parent && test(parts(b.selector)));
    assert.equal(found.length, 1, `one top-level block expected, found ${found.length}`);
    return found[0];
  };
  const child = (block, selector) => block.children.find(c => c.selector === selector);
  const value = (block, property) => block?.declarations.filter(d => d.property === property).at(-1)?.value;
  const tokenVar = new RegExp(`^var\\(--(${UNION_TOKENS.join('|')})\\)$`);

  it('colours a button only with the tokens', () => {
    const offending = all.filter(isButton).flatMap(b => b.declarations
      .filter(d => [ 'color', 'background-color', 'icon-color' ].includes(d.property))
      .filter(d => !tokenVar.test(d.value) && d.value !== 'none' && d.value !== 'transparent')
      .map(d => `button.css:${d.line} ${b.selector} { ${d.property}: ${d.value} }`));
    assert.deepEqual(offending, []);
  });

  it('gives a push button the tones of the prototype', () => {
    const button = top(p => p.includes('button') && p.includes('toolbutton.raised'));
    assert.equal(value(button, 'background-color'), 'var(--tone-3)');
    assert.equal(value(button, 'color'), 'var(--text)');
    assert.equal(value(child(button, '&:hovered'), 'background-color'), 'var(--tone-4)');
    assert.equal(value(child(button, '&:visual-focus'), 'background-color'), 'var(--raised-focus)');
    assert.equal(value(child(button, '&:disabled'), 'background-color'), 'var(--tone-3)');
    assert.equal(value(child(button, '&:disabled'), 'color'), 'var(--text-dim)');
    const pressed = top(p => p.includes('button:pressed'));
    assert.equal(value(pressed, 'background-color'), 'var(--tone-1)');
  });

  it('draws a highlighted button as any other (D-100: Union highlights every auto-default button)', () => {
    const offending = all.filter(b => chain(b).some(c => /:highlighted/.test(c.selector)) && isButton(b))
      .filter(b => b.declarations.some(d => [ 'color', 'background-color' ].includes(d.property)))
      .map(b => b.selector.replace(/\s+/g, ' '));
    assert.deepEqual(offending, []);
  });

  it('gives a tool button the tones of the prototype', () => {
    const tool = top(p => p.includes('toolbutton') && p.includes('button.flat'));
    assert.equal(value(child(tool, '&:hovered'), 'background-color'), 'var(--tone-3)');
    assert.equal(value(child(tool, '&:visual-focus'), 'background-color'), 'var(--raised-focus)');
    assert.equal(value(child(tool, '&:pressed'), 'background-color'), 'var(--tone-2)');
    assert.equal(value(child(tool, '&:checked'), 'background-color'), 'var(--tone-3)');
    assert.equal(value(child(tool, '&:checked'), 'color'), 'var(--accent)');
    assert.equal(value(child(tool, '&:checked:hovered'), 'background-color'), 'var(--tone-4)');
    assert.equal(value(child(tool, '&:checked:visual-focus'), 'background-color'), 'var(--raised-focus)');
    assert.equal(value(child(tool, '&:checked:pressed'), 'background-color'), 'var(--tone-2)');
  });

  it('writes no padding with two or more values, which Union reads swapped', () => {
    const resolve = v => v.replace(/var\(--([\w-]+)\)/g, (m, name) => value(all.find(b => b.selector === ':root'), `--${name}`) ?? m);
    const offending = all.filter(isButton).flatMap(b => b.declarations
      .filter(d => d.property === 'padding' && resolve(d.value).trim().split(/\s+/).length > 1)
      .map(d => `button.css:${d.line} padding: ${d.value}`));
    assert.deepEqual(offending, []);
  });

  it('makes a button 30 px high', () => {
    const root = all.find(b => b.selector === ':root');
    assert.equal(value(root, '--button-default-size'), '30px');
  });

  it('orders the states of each button block so that the later wins: hovered, focused, pressed, disabled', () => {
    const order = [ '&:hovered', '&:visual-focus', '&:pressed', '&:disabled' ];
    const offending = all.filter(isButton).flatMap(b => {
      const seen = b.children.filter(c => order.includes(c.selector) && value(c, 'background-color')).map(c => order.indexOf(c.selector));
      return seen.some((v, i) => i && v < seen[i - 1]) ? [ b.selector.replace(/\s+/g, ' ') ] : [];
    });
    assert.deepEqual(offending, []);
  });
});
