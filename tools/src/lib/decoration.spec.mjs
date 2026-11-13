import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BUTTON_STATES, GLYPHS, SIDES, formatButtonSvg, formatDecorationRc, formatDecorationSvg } from './decoration.mjs';
import { parseTokens } from './tokens.mjs';

const tokensWith = (extra = '') => parseTokens(`:root {
  --outline: #585248;
  --tone-0: #151413;
  --text: #e6dfd3;
  --text-dim: #a9a297;
  --outline-width: 1px;
  --title-bar-height: 30px;
  --tone-1: #1c1a18;
  --tone-2: #25221f;
  --danger: #b5442f;
  --on-danger: #fbf3e6;
${extra}
}`);

/** Every `<rect>` of the SVG as { id, x, y, width, height, fill }. */
function rects(svg) {
  return [ ...svg.matchAll(/<rect ([^>]*)\/>/g) ].map(([ , attributes ]) => {
    const value = name => attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
    return {
      id: value('id'), fill: value('fill'),
      x: Number(value('x')), y: Number(value('y')), width: Number(value('width')), height: Number(value('height'))
    };
  });
}

/** The keys of one `[group]` of the rc file, in order, as [ key, value ]. */
function group(rc, name) {
  const body = rc.split(`[${name}]\n`)[1].split('\n\n')[0];
  return body.split('\n').filter(Boolean).map(line => line.split('='));
}
const key = (rc, name, k) => Object.fromEntries(group(rc, name))[k];

describe('decoration', () => {
  const svg = formatDecorationSvg(tokensWith());
  const rc = formatDecorationRc(tokensWith());
  const all = rects(svg);
  const byId = id => all.find(r => r.id === id);
  const ids = SIDES.flatMap(side => [ `decoration-${side}`, `decoration-inactive-${side}` ]);

  it('draws both frames, nine elements each', () => {
    assert.equal(SIDES.length, 9);
    assert.equal(all.length, 18);
    assert.deepEqual(all.map(r => r.id).sort(), ids.sort());
  });

  it('draws the window outline on the edges and corners, one outline-width thick', () => {
    for (const prefix of [ 'decoration', 'decoration-inactive' ]) {
      for (const side of SIDES.filter(s => s !== 'center')) {
        const r = byId(`${prefix}-${side}`);
        assert.equal(r.fill, '#585248', `${r.id} fill`);
        if ([ 'top', 'bottom' ].includes(side)) {
          assert.equal(r.height, 1, `${r.id} height`);
        } else if ([ 'left', 'right' ].includes(side)) {
          assert.equal(r.width, 1, `${r.id} width`);
        } else {
          assert.deepEqual([ r.width, r.height ], [ 1, 1 ], `${r.id} size`);
        }
      }
    }
  });

  it('holds no -- inside a comment, which XML forbids and which leaves the frame undrawn (P5.1)', () => {
    const comments = [ ...svg.matchAll(/<!--([\s\S]*?)-->/g) ].map(m => m[1]);
    assert.ok(comments.length > 0);
    for (const comment of comments) {
      assert.ok(!comment.includes('--'), comment);
    }
  });

  it('fills the title bar in tone 0, active and inactive', () => {
    assert.equal(byId('decoration-center').fill, '#151413');
    assert.equal(byId('decoration-inactive-center').fill, '#151413');
  });

  it('lays the elements out without overlap', () => {
    const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    for (const [ i, a ] of all.entries()) {
      for (const b of all.slice(i + 1)) {
        assert.ok(!overlap(a, b), `${a.id} overlaps ${b.id}`);
      }
    }
  });

  it('follows the outline width', () => {
    const tokens = tokensWith().set('outline-width', { length: { value: 2, unit: 'px' } });
    const wide = rects(formatDecorationSvg(tokens));
    assert.equal(wide.find(r => r.id === 'decoration-top').height, 2);
    assert.equal(wide.find(r => r.id === 'decoration-inactive-left').width, 2);
    const wideRc = formatDecorationRc(tokens);
    assert.equal(key(wideRc, 'Layout', 'BorderLeft'), '2');
    assert.equal(key(wideRc, 'Layout', 'TitleEdgeTop'), '2');
  });

  it('lays out the title bar below the window outline', () => {
    assert.equal(key(rc, 'Layout', 'TitleHeight'), '30');
    assert.equal(key(rc, 'Layout', 'TitleEdgeTop'), '1');
    assert.equal(key(rc, 'Layout', 'TitleEdgeBottom'), '0');
    assert.equal(key(rc, 'Layout', 'TitleEdgeLeft'), '1');
    assert.equal(key(rc, 'Layout', 'BorderBottom'), '1');
    assert.equal(key(rc, 'Layout', 'PaddingTop'), '0');
    assert.equal(key(rc, 'Layout', 'ButtonHeight'), '30');
    assert.equal(key(rc, 'General', 'TitleAlignment'), 'Center');
  });

  it('colours the title: text when active, dim text when inactive', () => {
    assert.equal(key(rc, 'General', 'ActiveTextColor'), '230,223,211,255');
    assert.equal(key(rc, 'General', 'InactiveTextColor'), '169,162,151,255');
  });

  it('sorts the keys of each group', () => {
    for (const name of [ 'General', 'Layout' ]) {
      const keys = group(rc, name).map(([ k ]) => k);
      assert.deepEqual(keys, [ ...keys ].sort(), name);
    }
  });

  it('refuses a length that is not whole px', () => {
    const tokens = tokensWith().set('outline-width', { length: { value: 1.5, unit: 'px' } });
    assert.throws(() => formatDecorationSvg(tokens), /outline-width: .*whole px/);
    assert.throws(() => formatDecorationRc(tokens), /outline-width: .*whole px/);
  });

  it('refuses a colour that is not opaque, naming every problem', () => {
    const tokens = tokensWith('  --half: color-mix(in srgb, var(--tone-0) 50%, transparent);')
      .set('outline', { ref: 'half' });
    tokens.delete('text-dim');
    assert.throws(() => formatDecorationSvg(tokens), /outline: .*not opaque/);
    assert.throws(() => formatDecorationRc(tokens), error =>
      /text-dim: /.test(error.message) && error.message.split('\n').length >= 1);
  });

  it('is the same each time, and ends with one newline', () => {
    for (const [ text, again ] of [ [ svg, formatDecorationSvg(tokensWith()) ], [ rc, formatDecorationRc(tokensWith()) ] ]) {
      assert.equal(text, again);
      assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'));
    }
  });
});

const BUTTONS = [ 'minimize', 'maximize', 'restore', 'close' ];
const PREFIXES = [ 'active', 'hover', 'pressed', 'inactive', 'hover-inactive', 'pressed-inactive' ];

/** Each `<g id="…-center">` of a button file as { id, rect: {…}, path: {…} }, in order. */
function states(svg) {
  const attributes = text => Object.fromEntries([ ...text.matchAll(/([a-z-]+)="([^"]*)"/g) ].map(([ , k, v ]) => [ k, v ]));
  return [ ...svg.matchAll(/<g id="([^"]+)">\s*<rect ([^>]*)\/>\s*<path ([^>]*)\/>\s*<\/g>/g) ].map(([ , id, rect, path ]) => ({
    id, rect: attributes(rect), path: attributes(path)
  }));
}

describe('window buttons', () => {
  const files = Object.fromEntries(BUTTONS.map(button => [ button, formatButtonSvg(tokensWith(), button) ]));
  const state = (button, id) => states(files[button]).find(s => s.id === id);

  it('draws every state of a button', () => {
    assert.deepEqual(BUTTON_STATES.map(s => s.prefix), PREFIXES);
    for (const button of BUTTONS) {
      assert.deepEqual(states(files[button]).map(s => s.id), PREFIXES.map(p => `${p}-center`), button);
    }
  });

  it('fills each state', () => {
    assert.equal(state('minimize', 'active-center').rect.fill, '#151413');
    assert.equal(state('minimize', 'hover-center').rect.fill, '#1c1a18');
    assert.equal(state('minimize', 'pressed-center').rect.fill, '#25221f');
    assert.equal(state('minimize', 'pressed-inactive-center').rect.fill, '#25221f');
    assert.equal(state('close', 'active-center').rect.fill, '#151413');
    for (const id of [ 'hover-center', 'pressed-center', 'hover-inactive-center', 'pressed-inactive-center' ]) {
      assert.equal(state('close', id).rect.fill, '#b5442f', id);
      assert.equal(state('close', id).path.stroke, '#fbf3e6', id);
    }
  });

  it('dims the inactive glyph', () => {
    assert.equal(state('maximize', 'active-center').path.stroke, '#e6dfd3');
    assert.equal(state('maximize', 'inactive-center').path.stroke, '#a9a297');
    assert.equal(state('maximize', 'hover-inactive-center').path.stroke, '#a9a297');
    assert.equal(state('close', 'inactive-center').path.stroke, '#a9a297');
  });

  it('sizes the button by the title bar', () => {
    const tall = formatButtonSvg(tokensWith().set('title-bar-height', { length: { value: 36, unit: 'px' } }), 'close');
    for (const { rect, path } of states(tall)) {
      assert.deepEqual([ rect.width, rect.height ], [ '36', '36' ]);
      const [ , dx, dy ] = path.transform.match(/translate\(([\d.]+) ([\d.]+)\)/);
      assert.equal(Number(dx) - Number(rect.x), 10);
      assert.equal(Number(dy) - Number(rect.y), 10);
    }
  });

  it('lays the states side by side without overlap', () => {
    for (const button of BUTTONS) {
      const xs = states(files[button]).map(s => Number(s.rect.x));
      xs.slice(1).forEach((x, i) => assert.equal(x - xs[i], 30 + 8, button));
    }
  });

  it('draws the glyph as the prototype', () => {
    for (const button of BUTTONS) {
      for (const { path } of states(files[button])) {
        assert.equal(path.d, GLYPHS[button], button);
        assert.equal(path['stroke-width'], '1.5');
        assert.equal(path['stroke-linecap'], 'square');
        assert.equal(path.fill, 'none');
      }
    }
  });

  it('keeps the buttons at the top', () => {
    assert.equal(key(formatDecorationRc(tokensWith()), 'Layout', 'ButtonMarginTop'), '0');
  });

  it('refuses a fill that is not opaque', () => {
    const tokens = tokensWith('  --half: color-mix(in srgb, var(--tone-0) 50%, transparent);').set('danger', { ref: 'half' });
    assert.throws(() => formatButtonSvg(tokens, 'close'), /danger: .*not opaque/);
  });

  it('refuses a button Aurorae does not know', () => {
    assert.throws(() => formatButtonSvg(tokensWith(), 'shade'), /shade/);
  });

  it('holds no double hyphen in a comment, is the same each time and ends with one newline', () => {
    for (const button of BUTTONS) {
      const text = files[button];
      for (const [ , comment ] of text.matchAll(/<!--([\s\S]*?)-->/g)) {
        assert.ok(!comment.includes('--'), comment);
      }
      assert.equal(text, formatButtonSvg(tokensWith(), button));
      assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'));
    }
  });
});
