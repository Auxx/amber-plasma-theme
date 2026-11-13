import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BUTTON_STATES, FADE, GLYPHS, SIDES, cornerFade, fade, formatButtonSvg, formatDecorationRc, formatDecorationSvg, lights, padding
} from './decoration.mjs';
import { parseTokens } from './tokens.mjs';

/** The tokens of the window glow and the shadow, with the glow even on every side (D-60 before D-132). */
const LIGHT = `  --accent: #d1b072;
  --glow: color-mix(in srgb, var(--accent) 14%, transparent);
  --glow-size: 48px;
  --glow-inset-top: 0px;
  --glow-inset-side: 0px;
  --glow-inset-bottom: 0px;
  --shadow: rgb(0 0 0 / 55%);
  --shadow-size: 36px;
  --shadow-inset-top: 27px;
  --shadow-inset-side: 17px;
  --shadow-inset-bottom: 4px;`;

const tokensWith = (extra = '', light = LIGHT) => parseTokens(`:root {
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
${light}
${extra}
}`);

const attributesOf = text => Object.fromEntries([ ...text.matchAll(/([a-zA-Z][a-zA-Z0-9-]*)="([^"]*)"/g) ].map(([ , k, v ]) => [ k, v ]));

/** Every `<rect>` of a piece of SVG as { x, y, width, height, fill }, numbers as numbers. */
function rects(svg) {
  return [ ...svg.matchAll(/<rect ([^>]*)\/>/g) ].map(([ , text ]) => {
    const a = attributesOf(text);
    return { fill: a.fill, x: Number(a.x), y: Number(a.y), width: Number(a.width), height: Number(a.height) };
  });
}

/** Each `<g id>` of the frame as { id, rects, box }, where box holds every rect. */
function elements(svg) {
  return [ ...svg.matchAll(/<g id="([^"]+)">([\s\S]*?)<\/g>/g) ].map(([ , id, body ]) => {
    const all = rects(body);
    const left = Math.min(...all.map(r => r.x));
    const top = Math.min(...all.map(r => r.y));
    const box = {
      x: left, y: top,
      width: Math.max(...all.map(r => r.x + r.width)) - left,
      height: Math.max(...all.map(r => r.y + r.height)) - top
    };
    return { id, rects: all, box };
  });
}

/** Each gradient of the SVG by id: { kind, attributes, stops: [{ offset, colour, opacity }] }. */
function gradients(svg) {
  return Object.fromEntries([ ...svg.matchAll(/<(linear|radial)Gradient ([^>]*)>([\s\S]*?)<\/\1Gradient>/g) ]
    .map(([ , kind, head, body ]) => {
      const attributes = attributesOf(head);
      const stops = [ ...body.matchAll(/<stop ([^>]*)\/>/g) ].map(([ , text ]) => {
        const a = attributesOf(text);
        return { offset: Number(a.offset), colour: a['stop-color'], opacity: Number(a['stop-opacity']) };
      });
      return [ attributes.id, { kind, attributes, stops } ];
    }));
}

/** The opacity of a gradient at an offset, linear between its stops. */
function opacityAt({ stops }, offset) {
  if (offset <= stops[0].offset) {
    return stops[0].opacity;
  }
  for (let k = 1; k < stops.length; k++) {
    if (offset <= stops[k].offset) {
      const [ a, b ] = [ stops[k - 1], stops[k] ];
      return a.opacity + (offset - a.offset) / (b.offset - a.offset) * (b.opacity - a.opacity);
    }
  }
  return stops.at(-1).opacity;
}

const gradientId = fill => fill?.match(/^url\(#([^)]+)\)$/)?.[1];

/** The keys of one `[group]` of the rc file, in order, as [ key, value ]. */
function group(rc, name) {
  const body = rc.split(`[${name}]\n`)[1].split('\n\n')[0];
  return body.split('\n').filter(Boolean).map(line => line.split('='));
}
const key = (rc, name, k) => Object.fromEntries(group(rc, name))[k];

const near = (actual, expected, within = 1e-4, message = '') =>
  assert.ok(Math.abs(actual - expected) <= within, `${message} ${actual} is not within ${within} of ${expected}`);

describe('decoration', () => {
  const tokens = tokensWith();
  const svg = formatDecorationSvg(tokens);
  const rc = formatDecorationRc(tokens);
  const all = elements(svg);
  const byId = id => all.find(e => e.id === id);
  const ids = SIDES.flatMap(side => [ `decoration-${side}`, `decoration-inactive-${side}` ]);
  const grads = gradients(svg);
  const { active, inactive } = lights(tokens);
  const FRAMES = [ [ 'decoration', active ], [ 'decoration-inactive', inactive ] ];
  /** The rects of an element, from the outside in, across its thickness. */
  const across = (id, side) => {
    const rs = byId(id).rects;
    const key = { top: r => r.y, bottom: r => -r.y, left: r => r.x, right: r => -r.x }[side];
    return [ ...rs ].sort((a, b) => key(a) - key(b));
  };

  it('draws both frames, nine elements each', () => {
    assert.equal(SIDES.length, 9);
    assert.equal(all.length, 18);
    assert.deepEqual(all.map(e => e.id).sort(), ids.sort());
  });

  it('pads for the light (P5.3)', () => {
    for (const side of [ 'Top', 'Bottom', 'Left', 'Right' ]) {
      assert.equal(key(rc, 'Layout', `Padding${side}`), '48', side);
    }
  });

  it('draws the light outside the outline, the outline, then tone 0 as far in as the shadow starts (P5.3)', () => {
    const reach = { top: 27, bottom: 4, left: 17, right: 17 };
    for (const [ prefix, light ] of FRAMES) {
      for (const side of [ 'top', 'bottom', 'left', 'right' ]) {
        const id = `${prefix}-${side}`;
        const thick = [ 'top', 'bottom' ].includes(side) ? 'height' : 'width';
        assert.equal(byId(id).box[thick], 48 + 1 + reach[side], `${id} ${thick}`);
        const [ glow, outline, inner ] = across(id, side);
        assert.equal(glow[thick], 48, id);
        const g = grads[gradientId(glow.fill)];
        assert.ok(g, `${id}: the light is a gradient`);
        assert.equal(g.kind, 'linear');
        assert.equal(g.stops[0].colour, `#${[ light.colour.r, light.colour.g, light.colour.b ].map(v => v.toString(16).padStart(2, '0')).join('')}`);
        near(g.stops[0].opacity, fade(light, side, 0), 0.0001, id);
        assert.equal(g.stops.at(-1).opacity, 0, id);
        assert.deepEqual([ outline.fill, outline[thick] ], [ '#585248', 1 ], id);
        assert.deepEqual([ inner.fill, inner[thick] ], [ '#151413', reach[side] ], id);
      }
    }
  });

  it('draws the light on the fade, from the outline outwards (P5.3)', () => {
    const towardOutline = { top: { y1: '1', y2: '0' }, bottom: { y1: '0', y2: '1' }, left: { x1: '1', x2: '0' }, right: { x1: '0', x2: '1' } };
    for (const [ prefix, light ] of FRAMES) {
      for (const side of [ 'top', 'bottom', 'left', 'right' ]) {
        const g = grads[gradientId(across(`${prefix}-${side}`, side)[0].fill)];
        for (const [ k, v ] of Object.entries(towardOutline[side])) {
          assert.equal(g.attributes[k], v, `${prefix}-${side} ${k}`);
        }
        for (const f of [ 0, 0.25, 0.5, 0.75 ]) {
          near(opacityAt(g, f), fade(light, side, f * 48), 0.005, `${prefix}-${side} at ${f}`);
        }
      }
    }
  });

  it('draws the corners on the fade, round the corner of the window shrunk by the light\'s insets (P5.3)', () => {
    for (const [ prefix, light ] of FRAMES) {
      for (const corner of [ 'topleft', 'topright', 'bottomleft', 'bottomright' ]) {
        const e = byId(`${prefix}-${corner}`);
        const radial = e.rects.map(r => grads[gradientId(r.fill)]).find(g => g?.kind === 'radial');
        assert.ok(radial, `${e.id}: a radial gradient`);
        const { cx, cy, r } = Object.fromEntries([ 'cx', 'cy', 'r' ].map(k => [ k, Number(radial.attributes[k]) ]));
        assert.equal(radial.attributes.gradientUnits, 'userSpaceOnUse');
        // The window outline's outer corner, in the SVG: the outline rects of the element meet there.
        const sx = corner.endsWith('left') ? -1 : 1;
        const sy = corner.startsWith('top') ? -1 : 1;
        const outline = e.rects.filter(rr => rr.fill === '#585248');
        const xs = outline.map(rr => (sx < 0 ? rr.x : rr.x + rr.width));
        const ys = outline.map(rr => (sy < 0 ? rr.y : rr.y + rr.height));
        const ox = sx < 0 ? Math.min(...xs) : Math.max(...xs);
        const oy = sy < 0 ? Math.min(...ys) : Math.max(...ys);
        for (const d of [ 1, 5, 10, 20 ]) {
          const a = d / Math.SQRT2;
          const offset = Math.hypot(ox + sx * a - cx, oy + sy * a - cy) / r;
          near(opacityAt(radial, offset), cornerFade(light, corner, d), 0.005, `${e.id} at ${d}`);
        }
      }
    }
  });

  it('writes no colour with alpha (P5.3)', () => {
    assert.doesNotMatch(svg, /rgba|(?:fill|stop-color)="#[0-9a-f]{8}"/);
  });

  it('holds no -- inside a comment, which XML forbids and which leaves the frame undrawn (P5.1)', () => {
    const comments = [ ...svg.matchAll(/<!--([\s\S]*?)-->/g) ].map(m => m[1]);
    assert.ok(comments.length > 0);
    for (const comment of comments) {
      assert.ok(!comment.includes('--'), comment);
    }
  });

  it('fills the title bar in tone 0, active and inactive', () => {
    for (const id of [ 'decoration-center', 'decoration-inactive-center' ]) {
      assert.deepEqual(byId(id).rects.map(r => r.fill), [ '#151413' ], id);
    }
  });

  it('lays the elements out without overlap', () => {
    const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    for (const [ i, a ] of all.entries()) {
      for (const b of all.slice(i + 1)) {
        assert.ok(!overlap(a.box, b.box), `${a.id} overlaps ${b.id}`);
      }
    }
  });

  it('fills each element without a gap', () => {
    for (const { id, rects: rs, box } of all) {
      assert.equal(rs.reduce((sum, r) => sum + r.width * r.height, 0), box.width * box.height, id);
    }
  });

  it('follows the outline width', () => {
    const wideTokens = tokensWith().set('outline-width', { length: { value: 2, unit: 'px' } });
    const wide = elements(formatDecorationSvg(wideTokens));
    assert.equal(wide.find(e => e.id === 'decoration-top').box.height, 48 + 2 + 27);
    assert.ok(wide.find(e => e.id === 'decoration-inactive-left').rects.some(r => r.fill === '#585248' && r.width === 2));
    const wideRc = formatDecorationRc(wideTokens);
    assert.equal(key(wideRc, 'Layout', 'BorderLeft'), '2');
    assert.equal(key(wideRc, 'Layout', 'TitleEdgeTop'), '2');
  });

  it('lays out the title bar below the window outline', () => {
    assert.equal(key(rc, 'Layout', 'TitleHeight'), '30');
    assert.equal(key(rc, 'Layout', 'TitleEdgeTop'), '1');
    assert.equal(key(rc, 'Layout', 'TitleEdgeBottom'), '0');
    assert.equal(key(rc, 'Layout', 'TitleEdgeLeft'), '1');
    assert.equal(key(rc, 'Layout', 'BorderBottom'), '1');
    assert.equal(key(rc, 'Layout', 'ButtonHeight'), '30');
    assert.equal(key(rc, 'General', 'TitleAlignment'), 'Center');
  });

  it('keeps the shadow key on, which draws nothing on the title (P5.3)', () => {
    assert.equal(key(rc, 'General', 'Shadow'), 'true');
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
    const half = tokensWith().set('outline-width', { length: { value: 1.5, unit: 'px' } });
    assert.throws(() => formatDecorationSvg(half), /outline-width: .*whole px/);
    assert.throws(() => formatDecorationRc(half), /outline-width: .*whole px/);
  });

  it('refuses a colour that is not opaque, naming every problem', () => {
    const half = tokensWith('  --half: color-mix(in srgb, var(--tone-0) 50%, transparent);')
      .set('outline', { ref: 'half' });
    half.delete('text-dim');
    assert.throws(() => formatDecorationSvg(half), /outline: .*not opaque/);
    assert.throws(() => formatDecorationRc(half), error =>
      /text-dim: /.test(error.message) && error.message.split('\n').length >= 1);
  });

  it('is the same each time, and ends with one newline', () => {
    for (const [ text, again ] of [ [ svg, formatDecorationSvg(tokensWith()) ], [ rc, formatDecorationRc(tokensWith()) ] ]) {
      assert.equal(text, again);
      assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'));
    }
  });
});

/** The glow as tokens.css has it since D-132: 12 %, its fade starting 12 px in at the top and 6 at the sides. */
const SHIPPED = LIGHT.replace('14%', '12%').replace('--glow-inset-top: 0px', '--glow-inset-top: 12px')
  .replace('--glow-inset-side: 0px', '--glow-inset-side: 6px');
/** A glow whose fade starts further in than the shadow's at the top, and less far at the sides. */
const UNEVEN = LIGHT.replace('--glow-inset-top: 0px', '--glow-inset-top: 30px').replace('--glow-inset-side: 0px', '--glow-inset-side: 3px')
  .replace('--glow-inset-bottom: 0px', '--glow-inset-bottom: 8px');

for (const [ name, light ] of [ [ 'even glow', LIGHT ], [ 'shipped glow', SHIPPED ], [ 'uneven glow', UNEVEN ] ]) {
  describe(`the frame's light, ${name} (P5.3)`, () => {
    const tokens = tokensWith('', light);
    const svg = formatDecorationSvg(tokens);
    const all = elements(svg);
    const byId = id => all.find(e => e.id === id);
    const grads = gradients(svg);
    const states = lights(tokens);
    const pad = padding(tokens);
    const reach = Object.fromEntries([ 'top', 'bottom', 'left', 'right' ].map(side =>
      [ side, Math.max(states.active.inset[side], states.inactive.inset[side]) ]));
    const FRAMES = [ [ 'decoration', states.active ], [ 'decoration-inactive', states.inactive ] ];
    const across = (id, side) => {
      const order = { top: r => r.y, bottom: r => -r.y, left: r => r.x, right: r => -r.x }[side];
      return [ ...byId(id).rects ].sort((a, b) => order(a) - order(b));
    };

    it('pads the rc file as padding() says', () => {
      const rc = formatDecorationRc(tokens);
      assert.deepEqual([ 'Top', 'Left', 'Right', 'Bottom' ].map(side => Number(key(rc, 'Layout', `Padding${side}`))),
        [ pad.top, pad.left, pad.right, pad.bottom ]);
    });

    it('draws each edge as light, outline, then tone 0 as far in as either fade starts', () => {
      for (const [ prefix, state ] of FRAMES) {
        for (const side of [ 'top', 'bottom', 'left', 'right' ]) {
          const id = `${prefix}-${side}`;
          const thick = [ 'top', 'bottom' ].includes(side) ? 'height' : 'width';
          const [ glow, outline, inner ] = across(id, side);
          assert.equal(glow[thick], pad[side], id);
          assert.deepEqual([ outline.fill, outline[thick] ], [ '#585248', 1 ], id);
          assert.deepEqual([ inner.fill, inner[thick] ], [ '#151413', reach[side] ], id);
          const g = grads[gradientId(glow.fill)];
          for (const f of [ 0, 0.25, 0.5, 0.75 ]) {
            near(opacityAt(g, f), fade(state, side, f * pad[side]), 0.005, `${id} at ${f}`);
          }
        }
      }
    });

    it('fades each corner as cornerFade() says, beyond the outline', () => {
      for (const [ prefix, state ] of FRAMES) {
        for (const corner of [ 'topleft', 'topright', 'bottomleft', 'bottomright' ]) {
          const e = byId(`${prefix}-${corner}`);
          const sx = corner.endsWith('left') ? -1 : 1;
          const sy = corner.startsWith('top') ? -1 : 1;
          const outline = e.rects.filter(r => r.fill === '#585248');
          const xs = outline.map(r => (sx < 0 ? r.x : r.x + r.width));
          const ys = outline.map(r => (sy < 0 ? r.y : r.y + r.height));
          const ox = sx < 0 ? Math.min(...xs) : Math.max(...xs);
          const oy = sy < 0 ? Math.min(...ys) : Math.max(...ys);
          for (const d of [ 1, 5, 10, 20 ]) {
            // The pixel d px out along the diagonal, and the rect of the element that paints it.
            const a = d / Math.SQRT2;
            const [ px, py ] = [ ox + sx * a, oy + sy * a ];
            const r = e.rects.find(rr => px >= rr.x && px < rr.x + rr.width && py >= rr.y && py < rr.y + rr.height);
            if (!r) {
              continue; // beyond the element: the light has run out there
            }
            const g = grads[gradientId(r.fill)];
            let opacity;
            if (g.kind === 'radial') {
              const { cx, cy, r: radius } = Object.fromEntries([ 'cx', 'cy', 'r' ].map(k => [ k, Number(g.attributes[k]) ]));
              opacity = opacityAt(g, Math.hypot(px - cx, py - cy) / radius);
            } else {
              const vertical = g.attributes.y1 !== g.attributes.y2;
              const offset = vertical ? (sy < 0 ? r.y + r.height - py : py - r.y) / r.height
                : (sx < 0 ? r.x + r.width - px : px - r.x) / r.width;
              opacity = opacityAt(g, offset);
            }
            near(opacity, cornerFade(state, corner, d), 0.005, `${e.id} at ${d}`);
          }
        }
      }
    });

    it('fills each element without a gap or an overlap', () => {
      const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      for (const [ i, a ] of all.entries()) {
        assert.equal(a.rects.reduce((sum, r) => sum + r.width * r.height, 0), a.box.width * a.box.height, a.id);
        for (const b of all.slice(i + 1)) {
          assert.ok(!overlap(a.box, b.box), `${a.id} overlaps ${b.id}`);
        }
      }
    });
  });
}

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
  const tokens = tokensWith();
  const { active, inactive } = lights(tokens);

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

  it('shifts the glow by its own insets, as the shadow (P5.3)', () => {
    const shifted = tokensWith('', LIGHT.replace('--glow-inset-top: 0px', '--glow-inset-top: 12px')
      .replace('--glow-inset-side: 0px', '--glow-inset-side: 6px'));
    assert.deepEqual(lights(shifted).active.inset, { top: 12, left: 6, right: 6, bottom: 0 });
    assert.deepEqual(padding(shifted), { top: 36, left: 42, right: 42, bottom: 48 });
    assert.throws(() => lights(tokensWith('', LIGHT.replace('--glow-inset-top: 0px', '--glow-inset-top: 1.5px'))),
      /glow-inset-top: .*whole px/);
  });

  it('pads for the longer light', () => {
    assert.deepEqual(padding(tokens), { top: 48, left: 48, right: 48, bottom: 48 });
    assert.deepEqual(padding(tokensWith('', LIGHT.replace('--glow-size: 48px', '--glow-size: 8px'))),
      { top: 9, left: 19, right: 19, bottom: 32 });
    assert.throws(() => padding(tokensWith('', LIGHT.replace('--glow-size: 48px', '--glow-size: 47.5px'))), /glow-size: .*whole px/);
  });

  it('holds the stops of the fade in order, ending at nothing', () => {
    assert.equal(FADE.length, 12);
    assert.deepEqual(FADE.at(-1), [ 1, 0 ]);
    assert.ok(FADE.every(([ o ], i) => i === 0 || o > FADE[i - 1][0]));
  });
});
