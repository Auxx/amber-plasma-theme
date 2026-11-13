import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BUTTON_STATES, FADE, GLYPHS, SIDES, cornerFade, fade, formatButtonSvg, formatDecorationRc, formatDecorationSvg, lights, padding
} from './decoration.mjs';
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

/**
 * Each `<g id="…-center">` of a button file as { id, box, rect, path }, in
 * order: `box` is the transparent rectangle that sets the button's size,
 * `rect` the state's fill, `path` the glyph.
 */
function states(svg) {
  const attributes = text => Object.fromEntries([ ...text.matchAll(/([a-z-]+)="([^"]*)"/g) ].map(([ , k, v ]) => [ k, v ]));
  return [ ...svg.matchAll(/<g id="([^"]+)">\s*<rect ([^>]*)\/>\s*<rect ([^>]*)\/>\s*<path ([^>]*)\/>\s*<\/g>/g) ]
    .map(([ , id, box, rect, path ]) => ({ id, box: attributes(box), rect: attributes(rect), path: attributes(path) }));
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
    for (const { box, path } of states(tall)) {
      assert.deepEqual([ box.width, box.height ], [ '36', '36' ]);
      const [ , dx, dy ] = path.transform.match(/translate\(([\d.]+) ([\d.]+)\)/);
      assert.equal(Number(dx) - Number(box.x), 10);
      assert.equal(Number(dy) - Number(box.y), 10);
    }
  });

  it('lays the states side by side without overlap', () => {
    for (const button of BUTTONS) {
      const xs = states(files[button]).map(s => Number(s.box.x));
      xs.slice(1).forEach((x, i) => assert.equal(x - xs[i], 30 + 8, button));
    }
  });

  it('keeps the fill off the window outline (D-130)', () => {
    for (const button of BUTTONS) {
      for (const { id, box, rect } of states(files[button])) {
        assert.equal(box['fill-opacity'], '0', `${button} ${id} box`);
        assert.deepEqual([ box.y, box.width, box.height ], [ '0', '30', '30' ], `${button} ${id} box`);
        assert.equal(rect.x, box.x, `${button} ${id}`);
        assert.deepEqual([ rect.y, rect.height ], [ '1', '29' ], `${button} ${id} top`);
        assert.equal(rect.width, button === 'close' ? '29' : '30', `${button} ${id} right`);
      }
    }
  });

  it('insets the fill by the outline width', () => {
    const tokens = tokensWith().set('outline-width', { length: { value: 2, unit: 'px' } });
    for (const { rect } of states(formatButtonSvg(tokens, 'close'))) {
      assert.deepEqual([ rect.y, rect.width, rect.height ], [ '2', '28', '28' ]);
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

describe('the window glow and the shadow (P5.3)', () => {
  const LIGHT = `  --accent: #d1b072;
  --glow: color-mix(in srgb, var(--accent) 14%, transparent);
  --glow-size: 48px;
  --shadow: rgb(0 0 0 / 55%);
  --shadow-size: 36px;
  --shadow-inset-top: 27px;
  --shadow-inset-side: 17px;
  --shadow-inset-bottom: 4px;`;
  const tokens = tokensWith(LIGHT);
  const { active, inactive } = lights(tokens);
  /** mix at t, from FADE, written out for the spec. */
  const near = (actual, expected, within = 1e-4) =>
    assert.ok(Math.abs(actual - expected) <= within, `${actual} is not within ${within} of ${expected}`);

  it('fades as the prototype', () => {
    near(fade(active, 'top', 0), 0.14);
    near(fade(active, 'top', 24), 0.14 * 0.2553);
    assert.equal(fade(active, 'left', 48), 0);
  });

  it('starts the shadow inside the window', () => {
    // 27 / 36 = 0.75 lies between the stops 0.69 (0.071) and 0.831 (0.029).
    near(fade(inactive, 'top', 0), 0.55 * (0.071 + (0.75 - 0.69) / (0.831 - 0.69) * (0.029 - 0.071)));
    assert.equal(fade(inactive, 'top', 9), 0);
    assert.ok(fade(inactive, 'bottom', 31) > 0);
    assert.equal(fade(inactive, 'left', 1), fade(inactive, 'right', 1));
  });

  it('fades along a corner\'s diagonal from the inset rectangle\'s corner', () => {
    near(cornerFade(active, 'topleft', 0), 0.14);
    near(cornerFade(active, 'bottomright', 24), fade(active, 'top', 24));
    // The shadow's corner is centred 17 px in and 27 px down: 1 px out along the diagonal lies √((17 + a)² + (27 + a)²) from it, a = 1 / √2.
    const a = Math.SQRT1_2;
    near(cornerFade(inactive, 'topleft', 1), fade(inactive, 'top', Math.hypot(17 + a, 27 + a) - 27));
    near(cornerFade(inactive, 'bottomleft', 1), fade(inactive, 'bottom', Math.hypot(17 + a, 4 + a) - 4));
  });

  it('reads the lights from the tokens', () => {
    assert.deepEqual(active.inset, { top: 0, left: 0, right: 0, bottom: 0 });
    assert.deepEqual(inactive.inset, { top: 27, left: 17, right: 17, bottom: 4 });
    assert.equal(active.size, 48);
    assert.equal(inactive.size, 36);
    assert.deepEqual(active.colour, { r: 0xd1, g: 0xb0, b: 0x72, a: 0.14 });
    assert.deepEqual(inactive.colour, { r: 0, g: 0, b: 0, a: 0.55 });
  });

  it('pads for the longer light', () => {
    assert.deepEqual(padding(tokens), { top: 48, left: 48, right: 48, bottom: 48 });
    assert.deepEqual(padding(tokensWith(LIGHT.replace('--glow-size: 48px', '--glow-size: 8px'))),
      { top: 9, left: 19, right: 19, bottom: 32 });
    assert.throws(() => padding(tokensWith(LIGHT.replace('--glow-size: 48px', '--glow-size: 47.5px'))), /glow-size: .*whole px/);
  });

  it('holds the stops of the fade in order, ending at nothing', () => {
    assert.equal(FADE.length, 12);
    assert.deepEqual(FADE.at(-1), [ 1, 0 ]);
    assert.ok(FADE.every(([ o ], i) => i === 0 || o > FADE[i - 1][0]));
  });
});
