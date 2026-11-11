import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  composite,
  describeColour,
  formatOklch,
  isClose,
  measureContrast,
  parseColour,
  solveLightness,
  srgb8
} from './colour.mjs';

const c = parseColour;
const closeTo = (actual, expected, digits) =>
  assert.ok(Math.abs(actual - expected) < 10 ** -digits / 2, `${actual} is not close to ${expected}`);

describe('colour', () => {
  it('converts between notations', () => {
    assert.deepEqual(describeColour(c('#3574F0')), {
      oklch: 'oklch(58.8% 0.198 262)',
      hex: '#3574f0',
      rgb: 'rgb(53 116 240)',
      inGamut: true
    });
    assert.equal(describeColour(c('oklch(100% 0 0)')).hex, '#ffffff');
  });

  it('formats OKLCH with alpha when there is one', () => {
    assert.equal(formatOklch(c('oklch(55% 0.19 262)')), 'oklch(55% 0.19 262)');
    assert.equal(formatOklch({ ...c('black'), alpha: 0.05 }), 'oklch(0% 0 0 / 5%)');
  });

  it('flags colours outside sRGB and clips them per channel', () => {
    const red = describeColour(c('oklch(70% 0.4 30)'));
    assert.equal(red.inGamut, false);
    assert.equal(red.hex, '#ff0000');
  });

  it('refuses text that is not a colour', () => {
    assert.throws(() => parseColour('not-a-colour'), /Not a colour/);
  });

  it('measures WCAG contrast', () => {
    assert.equal(measureContrast(c('white'), [ c('black') ]).ratio, 21);
    closeTo(measureContrast(c('#777'), [ c('white') ]).ratio, 4.48, 2);
  });

  it('paints translucent layers over the ones below in 8 bits', () => {
    const hover = { ...c('black'), alpha: 0.05 };
    assert.deepEqual(composite([ c('white'), hover ]), { r: 242, g: 242, b: 242, alpha: 1 });
    assert.deepEqual(srgb8(c('oklch(95% 0.005 265)')), { r: 237, g: 238, b: 242, alpha: 1 });
  });

  it('reports a background that lets what is below show through', () => {
    assert.equal(measureContrast(c('black'), [ { ...c('white'), alpha: 0.5 } ]).opaque, false);
    assert.equal(measureContrast(c('black'), [ c('white') ]).opaque, true);
  });

  it('solves the lightness range that meets a minimum', () => {
    const { ranges } = solveLightness({ background: [ c('white') ], hue: 265, chroma: 0, minimum: 4.5 });
    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].from, 0);
    // #767676 is the lightest grey with 4.5:1 on white, OKLCH lightness 56.9 %.
    closeTo(ranges[0].to, 56.9, 0);
  });

  it('solves both sides of a mid-grey background', () => {
    const { ranges } = solveLightness({ background: [ c('#808080') ], hue: 0, chroma: 0, minimum: 3 });
    assert.equal(ranges.length, 2);
    assert.equal(ranges[1].to, 100);
  });

  it('marks ratios just above the minimum as close', () => {
    assert.equal(isClose(4.55, 4.5), true);
    assert.equal(isClose(4.7, 4.5), false);
    assert.equal(isClose(4.4, 4.5), false);
  });
});

describe('Amber starting tokens', () => {
  const ratio = (fg, ...bg) =>
    Number(measureContrast(parseColour(fg), bg.map(parseColour)).ratio.toFixed(2));

  it('matches the first measurements', () => {
    assert.equal(ratio('#e8e3da', '#25221f'), 12.38); // text on tone 2
    assert.equal(ratio('#9c958a', '#312e29'), 4.56); // dim text on tone 3
    assert.equal(ratio('#d1b072', '#25221f'), 7.66); // accent on tone 2
    assert.equal(ratio('#fbf3e6', '#b5442f'), 4.97); // on-danger on danger
    assert.equal(ratio('#151413', '#1c1a18'), 1.06); // tone 0 on tone 1
  });

  it('fails text on danger and dim text on tone 4', () => {
    assert.ok(ratio('#e8e3da', '#b5442f') < 4.5);
    assert.ok(ratio('#9c958a', '#3c3832') < 4.5);
  });

  it('marks dim text on tone 3 as close to 4.5', () => {
    assert.equal(isClose(4.56, 4.5), true);
    assert.equal(isClose(4.97, 4.5), false);
  });

  it('paints a part-transparent glow over its surface before measuring', () => {
    const glow = { ...parseColour('#d1b072'), alpha: 0.45 };
    const { ratio: r, opaque } = measureContrast(glow, [ parseColour('#25221f') ]);
    assert.equal(opaque, true);
    assert.equal(Number(r.toFixed(2)), 2.67); // 7.66 if the alpha were ignored
  });
});
