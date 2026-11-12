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

  // The one border allowed: the focus bar of a well, 3 px and not a hairline (P3.4), and the band of a text
  // area's frame that carries it, in the tone of the text area's viewport.
  const FOCUS_BAR = 'var(--well-focus-edge-width) solid var(--well-focus-edge)';
  const BAR_BAND = 'var(--well-focus-edge-width) solid var(--tone-2)';
  const focusBar = d => [ 'text.css', 'button.css' ].includes(d.file) && d.property === 'border-bottom'
    && ((d.value === FOCUS_BAR && parts(d.block.selector).includes('&:visual-focus')) || (d.value === BAR_BAND && d.block.selector.includes('[shape="panel"]')));
  // The second: a selected tab's block marker, 3 px on the edge away from its page, set at rest (P3.6, D-108).
  const EDGE = { top: 'top', bottom: 'bottom', left: 'left', right: 'right' };
  const tabMarker = d => d.file === 'tabs.css' && d.value === 'var(--marker-width) solid var(--tone-0)'
    && d.property === `border-${EDGE[d.block.selector.match(/^&\[direction="(\w+)"\]$/)?.[1]]}`;

  it('draws no border, but the focus bar of a well and the block marker of a tab', () => {
    assert.deepEqual(offending(d => /^border(-(top|right|bottom|left))?$/.test(d.property) && d.value !== 'none' && !zero(d.value) && !focusBar(d) && !tabMarker(d)), []);
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

  it('keeps the text of an open combo box, which Union marks :checked, as at rest', () => {
    const combo = top(p => p.length === 1 && p[0] === 'combobox');
    assert.equal(value(child(combo, '&:checked'), 'color'), 'var(--text)');
    assert.equal(value(child(combo, '&:checked'), 'background-color'), undefined, 'the open combo box keeps the tone of its other states');
  });

  it('keeps a disabled tool button still, even when checked and hovered, which outranks :disabled', () => {
    const tool = top(p => p.includes('toolbutton') && p.includes('button.flat'));
    const names = tool.children.map(c => c.selector);
    const disabled = child(tool, '&:checked:disabled');
    assert.ok(disabled, 'a &:checked:disabled block');
    assert.equal(value(disabled, 'background'), 'none');
    assert.equal(value(disabled, 'color'), 'var(--text-dim)');
    for (const compound of [ '&:checked:hovered', '&:checked:visual-focus', '&:checked:pressed' ]) {
      assert.ok(names.indexOf('&:checked:disabled') > names.indexOf(compound), `&:checked:disabled after ${compound}`);
    }
  });

  it('draws a raised tool button that is checked as a push button when pressed or disabled (D-99)', () => {
    const raised = top(p => p.length === 1 && p[0] === 'toolbutton.raised');
    assert.equal(value(child(raised, '&:checked:disabled'), 'background-color'), 'var(--tone-3)');
    assert.equal(value(child(raised, '&:checked:pressed'), 'background-color'), 'var(--tone-1)');
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

describe('the Union style\'s wells (P3.4)', () => {
  const text = blocks(read('text.css'));
  const button = blocks(read('button.css'));
  const chain = block => (block ? [ block, ...chain(block.parent) ] : []);
  const WELL = /(^|[\s,>(])(textfield|textarea|spinbox|searchfield)(?![\w-])/;
  const OTHER = /\.changed|\.inside-table/;
  const isWell = block => chain(block).some(b => WELL.test(b.selector) || /&\.editable/.test(b.selector))
    && !chain(block).some(b => OTHER.test(b.selector) || /popup\.combobox/.test(b.selector));
  const wells = [ ...text.map(b => [ 'text.css', b ]), ...button.map(b => [ 'button.css', b ]) ].filter(([ , b ]) => isWell(b));
  const top = (all, test) => {
    const found = all.filter(b => !b.parent && test(parts(b.selector)));
    assert.equal(found.length, 1, `one top-level block expected, found ${found.length}`);
    return found[0];
  };
  const child = (block, selector) => block?.children.find(c => c.selector === selector);
  // A well shows focus whenever it has the text cursor, clicked or tabbed (D-103): Union's :visual-focus is
  // keyboard focus only.
  const FOCUS = '&:active-focus, &:visual-focus';
  const focus = block => block?.children.find(c => parts(c.selector).join(', ') === FOCUS);
  const value = (block, property) => block?.declarations.filter(d => d.property === property).at(-1)?.value;
  const tokenVar = new RegExp(`^var\\(--(${UNION_TOKENS.join('|')})\\)$`);
  const BAR = 'var(--well-focus-edge-width) solid var(--well-focus-edge)';
  const base = () => top(text, p => [ 'textfield', 'textarea', 'spinbox', 'searchfield' ].every(n => p.includes(n)));
  const editable = () => {
    const combo = top(button, p => p.length === 1 && p[0] === 'combobox');
    return combo.children.find(c => parts(c.selector).includes('&.editable'));
  };

  it('colours a well only with the tokens', () => {
    const offending = wells.flatMap(([ file, b ]) => b.declarations
      .filter(d => [ 'color', 'background-color', 'icon-color', 'border-bottom-color' ].includes(d.property))
      .filter(d => !tokenVar.test(d.value) && d.value !== 'none' && d.value !== 'transparent')
      .map(d => `${file}:${d.line} ${b.selector.replace(/\s+/g, ' ')} { ${d.property}: ${d.value} }`));
    assert.deepEqual(offending, []);
  });

  it('gives a text field, spin box and text area the tones of the prototype, and the focus bar', () => {
    const well = base();
    assert.equal(value(well, 'background-color'), 'var(--well)');
    assert.equal(value(well, 'color'), 'var(--text)');
    assert.equal(value(child(well, '&:hovered'), 'background-color'), 'var(--well-hover)');
    assert.equal(value(focus(well), 'background-color'), 'var(--well-focus)');
    assert.equal(value(focus(well), 'border-bottom'), BAR);
    assert.equal(value(child(well, '&:disabled'), 'background-color'), 'var(--well)');
    assert.equal(value(child(well, '&:disabled'), 'color'), 'var(--text-dim)');
    assert.equal(value(child(well, '& > .placeholder'), 'color'), 'var(--text-dim)');
    assert.equal(value(child(child(well, '&:disabled'), '& > .placeholder'), 'color'), 'var(--text-dim)');
    assert.equal(value(well, 'height'), '30px');
  });

  it('draws an editable combo box as a well, with its arrow in text (dim text when disabled, as its text)', () => {
    const well = editable();
    assert.ok(well, 'an &.editable block in combobox');
    assert.equal(value(well, 'background-color'), 'var(--well)');
    assert.equal(value(well, 'color'), 'var(--text)');
    assert.equal(value(child(well, '&:hovered'), 'background-color'), 'var(--well-hover)');
    assert.equal(value(focus(well), 'background-color'), 'var(--well-focus)');
    assert.equal(value(focus(well), 'border-bottom'), BAR);
    assert.equal(value(child(well, '&:disabled'), 'background-color'), 'var(--well)');
    assert.equal(value(child(well, '&:disabled'), 'color'), 'var(--text-dim)');
    const arrows = button.filter(b => b.selector === '& > indicator' && chain(b).some(c => /combobox|&\.editable/.test(c.selector))
      && !chain(b).some(c => /:disabled/.test(c.selector)) && value(b, 'icon-color'));
    assert.ok(arrows.length, 'a combo box arrow');
    assert.deepEqual([ ...new Set(arrows.map(b => value(b, 'icon-color'))) ], [ 'var(--text)' ]);
  });

  it('gives the spin box\'s steps the prototype\'s tones, wherever Union reaches them', () => {
    const spin = top(text, p => p.length === 1 && p[0] === 'spinbox');
    assert.equal(value(spin, 'height'), '30px');
    for (const steps of [ child(spin, '& > indicator'), child(spin, '&.constrained > indicator') ]) {
      assert.ok(steps, 'a step block');
      assert.equal(value(steps, 'icon-color'), 'var(--text-dim)');
      assert.equal(value(steps, 'background-color'), 'transparent');
      assert.equal(value(child(steps, '&:hovered'), 'background-color'), 'var(--tone-3)');
      assert.equal(value(child(steps, '&:hovered'), 'icon-color'), 'var(--text)');
      assert.equal(value(child(steps, '&:pressed'), 'background-color'), 'var(--tone-2)');
      assert.equal(value(child(steps, '&:disabled'), 'icon-color'), 'var(--text-dim)');
    }
  });

  it('draws the focus bar of a text area on its frame, whose border must be there at rest (Qt Widgets)', () => {
    const area = top(text, p => p.length === 1 && p[0] === 'textarea');
    const panel = area.children.find(c => parts(c.selector).includes('&[shape="panel"]'));
    assert.ok(panel, 'a &[shape="panel"] block in textarea');
    assert.equal(value(panel, 'border-bottom'), 'var(--well-focus-edge-width) solid var(--tone-2)');
    assert.equal(value(focus(panel), 'border-bottom-color'), 'var(--well-focus-edge)');
  });

  it('leaves no later rule that takes the bar away: application.css names no text field or text area', () => {
    const offending = blocks(read('application.css')).filter(b => !b.parent && /(^|[\s,])(textfield|textarea)(?![\w-])/.test(b.selector));
    assert.deepEqual(offending.map(b => b.selector.replace(/\s+/g, ' ')), []);
  });

  it('orders the states of each well block so that the later wins: hovered, focused, disabled', () => {
    const order = [ '&:hovered', FOCUS, '&:disabled' ];
    const offending = wells.flatMap(([ , b ]) => {
      const seen = b.children.map(c => ({ ...c, selector: parts(c.selector).join(', ') })).filter(c => order.includes(c.selector) && value(c, 'background-color')).map(c => order.indexOf(c.selector));
      return seen.some((v, i) => i && v < seen[i - 1]) ? [ b.selector.replace(/\s+/g, ' ') ] : [];
    });
    assert.deepEqual(offending, []);
  });

  it('writes no padding with two or more values, which Union reads swapped', () => {
    const offending = wells.flatMap(([ file, b ]) => b.declarations
      .filter(d => d.property === 'padding' && d.value.trim().split(/\s+/).length > 1)
      .map(d => `${file}:${d.line} padding: ${d.value}`));
    assert.deepEqual(offending, []);
  });
});

describe('the Union style\'s toggles and ranges (P3.5)', () => {
  const check = blocks(read('check.css'));
  const bars = blocks(read('bars.css'));
  const chain = block => (block ? [ block, ...chain(block.parent) ] : []);
  const TOGGLE = /(^|[\s,>(])(checkbox|radiobutton|checkdelegate|radiodelegate|switch|switchdelegate)(?![\w-])/;
  const RANGE = /(^|[\s,>(])(slider|rangeslider|dial|progressbar|busyindicator)(?![\w-])/;
  const OTHER = /\.changed|scrollbar|menuitem/;
  const of = (all, file, test) => all.filter(b => chain(b).some(c => test.test(c.selector)) && !chain(b).some(c => OTHER.test(c.selector)))
    .map(b => [ file, b ]);
  const family = [ ...of(check, 'check.css', TOGGLE), ...of(bars, 'bars.css', RANGE) ];
  const top = (all, test) => {
    const found = all.filter(b => !b.parent && test(parts(b.selector)));
    assert.equal(found.length, 1, `one top-level block expected, found ${found.length}`);
    return found[0];
  };
  const child = (block, selector) => block?.children.find(c => parts(c.selector).join(', ') === selector);
  const value = (block, property) => block?.declarations.filter(d => d.property === property).at(-1)?.value;
  const tokenVar = new RegExp(`^var\\(--(${UNION_TOKENS.join('|')})\\)$`);
  const toggles = () => top(check, p => [ 'checkbox', 'checkdelegate', 'radiobutton', 'radiodelegate' ].every(n => p.includes(n)) && !p.includes('menuitem'));
  const slider = () => top(bars, p => [ 'slider', 'rangeslider', 'dial' ].every(n => p.includes(n)));
  const progress = () => top(bars, p => p.length === 1 && p[0] === 'progressbar');
  const COLOURS = [ 'color', 'background-color', 'icon-color', 'background-image-mask-color' ];

  it('colours a toggle and a range only with the tokens', () => {
    const offending = family.flatMap(([ file, b ]) => b.declarations
      .flatMap(d => (COLOURS.includes(d.property) ? [ [ d, d.value ] ] : d.property === 'background-image' && / mask (.+)$/.test(d.value) ? [ [ d, d.value.match(/ mask (.+)$/)[1] ] ] : []))
      .filter(([ , v ]) => !tokenVar.test(v) && v !== 'none' && v !== 'transparent')
      .map(([ d ]) => `${file}:${d.line} ${b.selector.replace(/\s+/g, ' ')} { ${d.property}: ${d.value} }`));
    assert.deepEqual(offending, []);
  });

  it('gives a check box and a radio button the tones of the prototype, and its mark', () => {
    const t = toggles();
    assert.equal(value(child(t, '& > indicator'), 'background-color'), 'var(--toggle)');
    assert.equal(value(child(t, '& > indicator'), 'width'), '16px');
    assert.equal(value(child(t, '&:hovered > indicator'), 'background-color'), 'var(--well-hover)');
    assert.equal(value(child(t, '&:visual-focus > indicator'), 'background-color'), 'var(--toggle-focus)');
    assert.equal(value(child(t, '&:checked > indicator'), 'background-color'), 'var(--accent)');
    assert.equal(value(child(t, '&:checked:hovered > indicator'), 'background-color'), 'var(--accent-hover)');
    assert.equal(value(child(t, '&:checked:visual-focus > indicator'), 'background-color'), 'var(--accent-hover)');
    assert.equal(value(child(t, '&:disabled'), 'color'), 'var(--text-dim)');
    assert.equal(value(child(child(t, '&:disabled'), '& > indicator'), 'background-color'), 'var(--toggle)');
    assert.equal(value(child(t, '&:checked:disabled > indicator'), 'background-color'), 'var(--toggle)');
    assert.equal(value(child(t, '&:checked:disabled > indicator'), 'background-image-mask-color'), 'var(--text-dim)');
    const marks = check.filter(b => !b.parent && !/menuitem/.test(b.selector) && /checkbox|radiobutton/.test(b.selector))
      .flatMap(b => b.children.filter(c => /:checked > indicator$|indeterminate > indicator$/.test(c.selector)))
      .map(c => value(c, 'background-image')).filter(Boolean);
    assert.deepEqual([ ...new Set(marks.map(m => m.replace(/^url\("\.\.\/images\/[a-z]+\.svg"\) mask /, ''))) ], [ 'var(--on-accent)' ]);
    assert.ok(marks.some(m => m.includes('checkmark.svg')) && marks.some(m => m.includes('radio.svg')) && marks.some(m => m.includes('indeterminate.svg')), marks.join('\n'));
  });

  it('draws a partly checked box as a checked one, with its own mark (D-105)', () => {
    const box = top(check, p => p.join(', ') === 'checkbox, checkdelegate');
    assert.equal(value(child(box, '&.indeterminate > indicator'), 'background-color'), 'var(--accent)');
    assert.equal(value(child(box, '&.indeterminate:hovered > indicator'), 'background-color'), 'var(--accent-hover)');
    assert.equal(value(child(box, '&.indeterminate:visual-focus > indicator'), 'background-color'), 'var(--accent-hover)');
    assert.equal(value(child(box, '&.indeterminate:disabled > indicator'), 'background-color'), 'var(--toggle)');
    assert.equal(value(child(box, '&.indeterminate:disabled > indicator'), 'background-image-mask-color'), 'var(--text-dim)');
  });

  it('keeps the label 8 px from the box, as the prototype does', () => {
    const label = top(check, p => p.join(', ') === 'checkbox, radiobutton, switch');
    assert.equal(value(label, 'spacing'), '8px');
    assert.equal(value(label, 'color'), 'var(--text)');
  });

  it('gives a slider the tones and sizes of the prototype', () => {
    const s = slider();
    assert.equal(value(s, 'background-color'), 'var(--track)');
    assert.equal(value(child(s, '& > fill'), 'background-color'), 'var(--accent)');
    assert.equal(value(child(s, '& > handle'), 'background-color'), 'var(--thumb)');
    assert.equal(value(child(s, '&:hovered > handle'), 'background-color'), 'var(--thumb-hover)');
    assert.equal(value(child(s, '&:visual-focus > handle, & > handle:active-focus'), 'background-color'), 'var(--raised-focus)');
    assert.equal(value(child(s, '&:pressed > handle, & > handle:pressed'), 'background-color'), 'var(--thumb-pressed)');
    const disabled = child(s, '&:disabled');
    assert.equal(value(disabled, 'background-color'), 'var(--track)');
    assert.equal(value(child(disabled, '& > fill'), 'background-color'), 'var(--text-dim)');
    assert.equal(value(child(disabled, '& > handle'), 'background-color'), 'var(--tone-3)');
    assert.equal(value(child(disabled, '& > tickmark, & > tickmark.active'), 'background-color'), 'var(--tone-3)');
    assert.equal(value(child(s, '& > tickmark'), 'background-color'), 'var(--text-dim)');
    assert.equal(value(child(child(s, '& > tickmark'), '&.active'), 'background-color'), 'var(--text-dim)');
    const horizontal = child(s, '&.horizontal');
    assert.equal(value(horizontal, 'height'), '6px');
    assert.equal(value(child(horizontal, '& > handle'), 'width'), '10px');
    assert.equal(value(child(horizontal, '& > handle'), 'height'), '20px');
    assert.equal(value(child(horizontal, '& > tickmark'), 'width'), 'var(--marker-width)');
    const vertical = child(s, '&.vertical');
    assert.equal(value(vertical, 'width'), '6px');
    assert.equal(value(child(vertical, '& > handle'), 'width'), '20px');
    assert.equal(value(child(vertical, '& > handle'), 'height'), '10px');
    assert.equal(value(child(vertical, '& > tickmark'), 'height'), 'var(--marker-width)');
    // :pressed also matches the slider itself, so no state block but :disabled colours the track (Task 1).
    assert.deepEqual(s.children.filter(c => /:(hovered|visual-focus|pressed)/.test(c.selector) && value(c, 'background-color') && !/handle/.test(c.selector)).map(c => c.selector), []);
  });

  it('gives a progress bar the tones and size of the prototype, with no text and no inset', () => {
    const p = progress();
    assert.equal(value(p, 'background-color'), 'var(--track)');
    assert.equal(value(p, 'color'), 'transparent');
    assert.equal(value(p, 'inset'), '0px');
    assert.equal(value(p, 'padding'), '0px');
    assert.equal(value(child(p, '& > track, & > chunk'), 'background-color'), 'var(--accent)');
    assert.equal(value(child(p, '&.horizontal'), 'height'), '6px');
    assert.equal(value(child(p, '&.vertical'), 'width'), '6px');
    const disabled = child(p, '&:disabled');
    assert.equal(value(disabled, 'background-color'), 'var(--track)');
    assert.equal(value(child(disabled, '& > track, & > chunk'), 'background-color'), 'var(--text-dim)');
  });

  it('orders the states of each block so that the later wins: hovered, focused, pressed, disabled', () => {
    const rank = selector => [ /:hovered/, /:visual-focus|:active-focus/, /:pressed/, /:disabled/ ].findIndex(r => r.test(selector));
    const offending = family.flatMap(([ file, b ]) => {
      const seen = b.children.filter(c => value(c, 'background-color') || c.children.some(g => value(g, 'background-color')))
        .map(c => ({ selector: c.selector, checked: /:checked|\.indeterminate/.test(c.selector), rank: rank(c.selector) }))
        .filter(c => c.rank >= 0);
      const out = [];
      for (const group of [ false, true ]) {
        const ranks = seen.filter(c => c.checked === group).map(c => c.rank);
        if (ranks.some((r, i) => i && r < ranks[i - 1])) {
          out.push(`${file}: ${b.selector.replace(/\s+/g, ' ')}`);
        }
      }
      return out;
    });
    assert.deepEqual(offending, []);
  });

  it('draws no mark with a round end or join', () => {
    const images = join(STYLE, 'contents/images');
    const offending = readdirSync(images).filter(f => f.endsWith('.svg')).filter(f => /round/.test(readFileSync(join(images, f), 'utf8')));
    assert.deepEqual(offending, []);
  });

  it('writes no padding with two or more values, which Union reads swapped', () => {
    const offending = family.flatMap(([ file, b ]) => b.declarations
      .filter(d => d.property === 'padding' && d.value.trim().split(/\s+/).length > 1)
      .map(d => `${file}:${d.line} padding: ${d.value}`));
    assert.deepEqual(offending, []);
  });
});

describe('the Union style\'s bars (P3.6)', () => {
  const files = { 'application.css': /^(toolbar|scrollareacorner)$/, 'popup.css': /^(menubar|menubaritem)$/,
    'widgets.css': /^statusbar$/, 'tabs.css': /^(tabbutton|tabbar|tabwidget)(\.immutable)?$/, 'bars.css': /^scrollbar$/ };
  const all = Object.fromEntries(Object.keys(files).map(f => [ f, blocks(read(f)) ]));
  const below = block => [ block, ...block.children.flatMap(below) ];
  const family = Object.entries(files).flatMap(([ file, test ]) => all[file]
    .filter(b => !b.parent && parts(b.selector).every(p => test.test(p)))
    .flatMap(below).map(b => [ file, b ]));
  const top = (file, selector) => {
    const found = all[file].filter(b => !b.parent && parts(b.selector).join(', ') === selector);
    assert.equal(found.length, 1, `${file}: one block ${selector} expected, found ${found.length}`);
    return found[0];
  };
  const child = (block, selector) => block?.children.find(c => parts(c.selector).join(', ') === selector);
  const value = (block, property) => block?.declarations.filter(d => d.property === property).at(-1)?.value;
  const tokenVar = new RegExp(`^var\\(--(${UNION_TOKENS.join('|')})\\)$`);
  const colourOf = d => (/^border(-(top|right|bottom|left))?$/.test(d.property) ? d.value.split(/\s+/).slice(2).join(' ') || null
    : /(^|-)color$/.test(d.property) ? d.value : null);

  it('finds every bar block', () => {
    assert.deepEqual([ ...new Set(family.filter(([ , b ]) => !b.parent).map(([ f, b ]) => `${f} ${b.selector}`)) ].sort(), [
      'application.css scrollareacorner', 'application.css toolbar', 'bars.css scrollbar', 'popup.css menubar',
      'popup.css menubaritem', 'tabs.css tabbar', 'tabs.css tabbutton', 'tabs.css tabwidget', 'widgets.css statusbar' ]);
  });

  it('colours a bar only with the tokens', () => {
    const offending = family.flatMap(([ file, b ]) => b.declarations
      .filter(d => colourOf(d) !== null && d.value !== 'none')
      .filter(d => !tokenVar.test(colourOf(d)) && colourOf(d) !== 'transparent')
      .map(d => `${file}:${d.line} ${b.selector} { ${d.property}: ${d.value} }`));
    assert.deepEqual(offending, []);
  });

  it('changes no bar in the inactive window', () => {
    assert.deepEqual(family.filter(([ , b ]) => /\.inactive/.test(b.selector)).map(([ f, b ]) => `${f} ${b.selector}`), []);
  });

  it('fills a header toolbar with tone 0 and leaves any other toolbar clear', () => {
    const t = top('application.css', 'toolbar');
    assert.equal(value(t, 'background-color'), 'transparent');
    assert.equal(value(t, 'color'), 'var(--text)');
    assert.equal(value(child(t, '&.header, &[colorset="header"], [colorset="header"] &'), 'background-color'), 'var(--tone-0)');
    assert.equal(value(child(t, '&[colorset="complementary"], [colorset="complementary"] &, &.header[colorset="complementary"]'), 'background-color'), 'var(--tone-0)');
    // Qt draws a toolbar's separator with the grip's rule (Task 1): neither has a fill.
    assert.equal(value(child(t, '& > handle'), 'background-color'), 'transparent');
    assert.equal(value(child(t, '& > separator'), 'background-color'), 'transparent');
    assert.equal(value(child(t, '& > separator'), 'width'), '8px');
  });

  it('gives the menu bar and its titles the tones of the prototype', () => {
    assert.equal(value(top('popup.css', 'menubar'), 'background-color'), 'var(--tone-0)');
    const m = top('popup.css', 'menubaritem');
    assert.equal(value(m, 'background-color'), 'transparent');
    assert.equal(value(m, 'color'), 'var(--text)');
    assert.equal(value(m, 'border-radius'), '0px');
    assert.equal(value(child(m, '&:hovered, &:highlighted'), 'background-color'), 'var(--tone-3)');
    assert.equal(value(child(m, '&:pressed'), 'background-color'), 'var(--popup)');
    assert.equal(value(child(m, '&:pressed'), 'color'), 'var(--text)');
    assert.equal(value(child(m, '&:disabled'), 'color'), 'var(--text-dim)');
  });

  it('gives the status bar tone 1 and dim text', () => {
    const s = top('widgets.css', 'statusbar');
    assert.equal(value(s, 'background-color'), 'var(--tone-1)');
    assert.equal(value(s, 'color'), 'var(--text-dim)');
  });

  it('gives a tab the tones of the prototype, and the block marker on its outer edge', () => {
    const t = top('tabs.css', 'tabbutton');
    // Union draws no tab bar (Task 1), so each tab paints the bar's tone 0 itself (D-108).
    assert.equal(value(t, 'background-color'), 'var(--tone-0)');
    assert.equal(value(t, 'color'), 'var(--text)');
    for (const edge of [ 'top', 'bottom', 'left', 'right' ]) {
      const direction = child(t, `&[direction="${edge}"]`);
      assert.equal(value(direction, `border-${edge}`), 'var(--marker-width) solid var(--tone-0)', edge);
      assert.deepEqual(direction.declarations.filter(d => /^border/.test(d.property) && d.property !== `border-${edge}`).map(d => d.property), [], edge);
    }
    // A tab beside its pages turns its padding with it: 12 px along the tab, 4 px across (Task 4).
    const side = child(t, '&[direction="left"], &[direction="right"]');
    assert.deepEqual([ 'top', 'bottom', 'left', 'right' ].map(e => value(side, `padding-${e}`)), [ '12px', '12px', '4px', '4px' ]);
    const tone = (selector, background, border) => {
      assert.equal(value(child(t, selector), 'background-color'), background, selector);
      assert.equal(value(child(t, selector), 'border-color'), border, selector);
    };
    // The background is not drawn under the marker's edge, so each state gives the edge its own fill (Task 1).
    tone('&:hovered', 'var(--tone-1)', 'var(--tone-1)');
    tone('&:visual-focus', 'var(--surface-focus)', 'var(--surface-focus)');
    tone('&:checked, &:highlighted', 'var(--tone-2)', 'var(--accent)');
    tone('&:checked:visual-focus, &:highlighted:visual-focus', 'var(--surface-focus)', 'var(--accent)');
    tone('&:disabled', 'var(--tone-0)', 'var(--tone-0)');
    // A disabled selected tab keeps tone 2 and its marker; only its text dims, as the prototype's.
    tone('&:checked:disabled, &:highlighted:disabled', 'var(--tone-2)', 'var(--accent)');
    assert.equal(value(child(t, '&:checked:disabled, &:highlighted:disabled'), 'color'), 'var(--text-dim)');
    assert.equal(value(child(t, '&:disabled'), 'color'), 'var(--text-dim)');
    // Every state that colours the marker's edge comes after the edges are set.
    const at = selector => t.children.findIndex(c => parts(c.selector).join(', ') === selector);
    assert.ok(at('&:hovered') > at('&[direction="right"]'));
    const close = child(t, '& > closebutton');
    assert.equal(value(close, 'background-color'), 'transparent');
    assert.equal(value(close, 'color'), 'var(--text-dim)');
    assert.equal(value(child(close, '&:hovered, &:pressed'), 'background-color'), 'var(--danger)');
    assert.equal(value(child(close, '&:hovered, &:pressed'), 'color'), 'var(--on-danger)');
    assert.equal(value(top('tabs.css', 'tabwidget'), 'background-color'), 'var(--tone-2)');
    assert.equal(value(top('tabs.css', 'tabbar'), 'background-color'), 'var(--tone-0)');
  });

  it('draws a tab with square corners, and a page with no inset that would leave a line', () => {
    assert.deepEqual(all['tabs.css'].filter(b => /\.(first|last)\b/.test(b.selector)).map(b => b.selector), []);
    const offending = family.flatMap(([ file, b ]) => b.declarations
      .filter(d => (/radius$/.test(d.property) && d.value !== '0px') || (/^inset/.test(d.property) && d.value !== '0px'))
      .map(d => `${file}:${d.line} ${b.selector} { ${d.property}: ${d.value} }`));
    assert.deepEqual(offending, []);
  });

  it('gives a scrollbar a 12 px thumb on no track, in the tones of the prototype', () => {
    const s = top('bars.css', 'scrollbar');
    assert.equal(value(s, 'width'), 'var(--scrollbar-size)');
    assert.equal(value(blocks(read('variables.css')).find(b => b.selector === ':root'), '--scrollbar-size'), '12px');
    for (const side of [ 'top', 'bottom', 'left', 'right' ]) {
      assert.equal(value(s, `padding-${side}`), '0px', side);
    }
    assert.equal(value(s, 'background-color'), 'transparent');
    const thumb = child(s, '& > handle');
    assert.equal(value(thumb, 'background-color'), 'var(--thumb)');
    assert.equal(value(child(thumb, '&:hovered'), 'background-color'), 'var(--thumb-hover)');
    assert.equal(value(child(thumb, '&:pressed'), 'background-color'), 'var(--thumb-pressed)');
    assert.equal(value(child(thumb, '&:disabled'), 'background-color'), 'var(--tone-3)');
    assert.equal(value(top('application.css', 'scrollareacorner'), 'background-color'), 'transparent');
  });

  it('fills no part of a bar one pixel thick', () => {
    const offending = family.flatMap(([ file, b ]) => b.declarations
      .filter(d => /^(width|height)$/.test(d.property) && d.value === '1px')
      .map(d => `${file}:${d.line} ${b.selector} { ${d.property}: ${d.value} }`));
    assert.deepEqual(offending, []);
  });

  it('orders the states of each block so that the later wins: hovered, focused, pressed, checked, disabled', () => {
    const rank = selector => [ /:hovered/, /:visual-focus|:active-focus/, /:pressed/, /:checked|:highlighted/, /:disabled/ ]
      .findIndex(r => r.test(selector));
    const offending = family.filter(([ , b ]) => !/:/.test(b.selector)).flatMap(([ file, b ]) => {
      const ranks = b.children.filter(c => value(c, 'background-color') || value(c, 'color'))
        .map(c => (/:(checked|highlighted):disabled/.test(c.selector) ? 4.5
          : /:(checked|highlighted):visual-focus/.test(c.selector) ? 3.5 : rank(c.selector))).filter(r => r >= 0);
      return ranks.some((r, i) => i && r < ranks[i - 1]) ? [ `${file}: ${b.selector}` ] : [];
    });
    assert.deepEqual(offending, []);
  });

  it('writes no padding with two or more values, which Union reads swapped', () => {
    const offending = family.flatMap(([ file, b ]) => b.declarations
      .filter(d => d.property === 'padding' && d.value.trim().split(/\s+/).length > 1)
      .map(d => `${file}:${d.line} padding: ${d.value}`));
    assert.deepEqual(offending, []);
  });
});
