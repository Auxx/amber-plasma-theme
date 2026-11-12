import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from '../lib/png.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));

function image(...args) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [ 'tools/src/bin/image.mjs', ...args ], {
    cwd: root,
    encoding: 'utf8'
  });
  return { status, stdout, stderr };
}

/** A picture one row high from hex colours. */
function row(...hexes) {
  const pixels = new Uint8Array(hexes.length * 4);
  hexes.forEach((h, x) => pixels.set([ 1, 3, 5 ].map(i => parseInt(h.slice(i, i + 2), 16)).concat(255), x * 4));
  return encodePng({ width: hexes.length, height: 1, pixels });
}

describe('image tool', () => {
  mkdirSync(join(root, 'tmp'), { recursive: true });
  const folder = mkdtempSync(join(root, 'tmp', 'image-spec-'));
  const path = name => relative(root, join(folder, name));
  after(() => rmSync(folder, { recursive: true, force: true }));

  writeFileSync(join(folder, 'warm.png'), row('#151413', '#25221f', '#e8e3da'));
  writeFileSync(join(folder, 'grey.png'), row('#151413', '#151413', '#25221f', '#25221f', '#808080'));

  it('finds no cool grey in a warm picture', () => {
    const { status, stdout } = image('greys', path('warm.png'));
    assert.equal(status, 0);
    assert.match(stdout, /no cool grey/);
  });

  it('lists a cool grey with its count and place, and fails', () => {
    const { status, stdout } = image('greys', path('grey.png'));
    assert.equal(status, 1);
    assert.match(stdout, /#808080 {2}1 px {2}at 4,0 1×1/);
  });

  it('refuses an empty region', () => {
    assert.equal(image('greys', path('grey.png'), '--region', '0,0,0,1').status, 2);
  });

  it('refuses a region that is not four numbers', () => {
    assert.equal(image('greys', path('grey.png'), '--region', '0,0,1').status, 2);
  });

  it('refuses to mark outside the repository', () => {
    assert.equal(image('greys', path('grey.png'), '--mark', '/tmp/amber-marked.png').status, 2);
    assert.equal(existsSync('/tmp/amber-marked.png'), false);
  });

  it('writes a marked copy inside the repository and says where', () => {
    const out = path('marked.png');
    const { status, stdout } = image('greys', path('grey.png'), '--mark', out);
    assert.equal(status, 1);
    assert.match(stdout, new RegExp(`marked: ${out.replace(/[.]/g, '\\.')}`));
    const marked = decodePng(readFileSync(join(root, out)));
    assert.deepEqual([ ...marked.pixels.slice(16, 20) ], [ 255, 0, 255, 255 ]);
  });

  it('lists the most common colours in JSON, named as tokens', () => {
    const { status, stdout } = image('colours', path('grey.png'), '--top', '2', '--json');
    assert.equal(status, 0);
    const counts = JSON.parse(stdout);
    assert.equal(counts.length, 2);
    assert.deepEqual(counts[0], { hex: '#151413', count: 2, token: 'tone-0' });
  });

  /** A 30×20 picture of surface #25221f holding a 20×10 rectangle, with or without a 1 px border. */
  function boxed(border) {
    const pixels = new Uint8Array(30 * 20 * 4);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 30; x++) {
        const inside = x >= 5 && x < 25 && y >= 5 && y < 15;
        const edge = inside && (x === 5 || x === 24 || y === 5 || y === 14);
        pixels.set(!inside ? [ 0x25, 0x22, 0x1f, 255 ] : border && edge ? [ 0x3c, 0x38, 0x32, 255 ] : [ 0x31, 0x2e, 0x29, 255 ], (y * 30 + x) * 4);
      }
    }
    return encodePng({ width: 30, height: 20, pixels });
  }
  writeFileSync(join(folder, 'plain.png'), boxed(false));
  writeFileSync(join(folder, 'bordered.png'), boxed(true));

  it('finds no line or rounded corner in a plain rectangle', () => {
    const { status, stdout } = image('frame', path('plain.png'), '--surface', '#25221f');
    assert.equal(status, 0);
    assert.match(stdout, /box 5,5 20×10/);
  });

  it('names each side with a line, its colour and thickness, and fails', () => {
    const { status, stdout } = image('frame', path('bordered.png'), '--surface', '#25221f');
    assert.equal(status, 1);
    assert.match(stdout, /top: line #3c3832 1 px/);
    assert.match(stdout, /left: line #3c3832 1 px/);
  });

  it('prints the whole result as JSON', () => {
    const { status, stdout } = image('frame', path('bordered.png'), '--surface', '#25221f', '--json');
    assert.equal(status, 1);
    const result = JSON.parse(stdout);
    assert.equal(result.drawn, true);
    assert.deepEqual(result.box, { x: 5, y: 5, width: 20, height: 10 });
    assert.equal(result.sides.bottom, 'line');
    assert.deepEqual(result.lines.bottom, { hex: '#3c3832', thickness: 1 });
  });

  it('refuses frame without --surface', () => {
    assert.equal(image('frame', path('plain.png')).status, 2);
  });

  it('refuses a --surface that is not a hex colour', () => {
    assert.equal(image('frame', path('plain.png'), '--surface', 'brown').status, 2);
  });

  it('fails on a file that is not a PNG', () => {
    writeFileSync(join(folder, 'not.png'), 'GIF89a');
    const { status, stderr } = image('greys', path('not.png'));
    assert.equal(status, 1);
    assert.match(stderr, /not a PNG/);
  });

  describe('states', () => {
    const cases = join(folder, 'states');
    mkdirSync(cases, { recursive: true });
    const button = (fill, text) => row(...Array(8).fill(fill), text, text);
    writeFileSync(join(cases, 'push-button-rest.png'), button('#312e29', '#e8e3da'));
    writeFileSync(join(cases, 'push-button-hovered.png'), button('#3c3832', '#e8e3da'));
    writeFileSync(join(cases, 'push-button-hovered-focused.png'), button('#695c45', '#e8e3da'));
    writeFileSync(join(cases, 'other-rest.png'), button('#000000', '#ffffff'));
    writeFileSync(join(cases, 'manifest.json'), JSON.stringify([
      { file: 'push-button-rest.png', widget: 'push-button', state: 'rest', reached: true },
      { file: 'push-button-hovered.png', widget: 'push-button', state: 'hovered', reached: true },
      { file: 'push-button-hovered-focused.png', widget: 'push-button', state: 'hovered-focused', reached: true },
      { file: 'other-rest.png', widget: 'other', state: 'rest', reached: true }
    ]));
    const state = (name, bg, text) => ({ state: name, background: { hex: bg, tokens: [] }, text: { hex: text, tokens: [] } });
    const good = [ state('rest', '#312e29', '#e8e3da'), state('hovered', '#3c3832', '#e8e3da'), state('focused', '#695c45', '#e8e3da') ];
    writeFileSync(join(cases, 'good.json'), JSON.stringify(good));
    writeFileSync(join(cases, 'bad.json'), JSON.stringify([ good[0], state('hovered', '#312e29', '#e8e3da') ]));
    const dir = relative(root, cases);

    it('passes when every state matches, through an alias', () => {
      const { status, stdout } = image('states', dir, '--case', 'push-button', '--expect', join(dir, 'good.json'), '--alias', 'hovered-focused=focused');
      assert.equal(status, 0, stdout);
      assert.match(stdout, /rest\s+ok/);
      assert.match(stdout, /hovered-focused\s+ok/);
      assert.doesNotMatch(stdout, /not compared/);
    });

    it('fails on a state that does not match, naming both colours', () => {
      const { status, stdout } = image('states', dir, '--case', 'push-button', '--expect', join(dir, 'bad.json'));
      assert.equal(status, 1);
      assert.match(stdout, /hovered\s+background #3c3832.*expected #312e29/);
      assert.match(stdout, /hovered-focused\s+not compared/);
    });

    it('lists an expected state the probe did not draw', () => {
      const { stdout } = image('states', dir, '--case', 'push-button', '--expect', join(dir, 'good.json'));
      assert.match(stdout, /focused\s+not compared/);
    });

    it('prints JSON', () => {
      const { status, stdout } = image('states', dir, '--case', 'push-button', '--expect', join(dir, 'good.json'), '--alias', 'hovered-focused=focused', '--json');
      assert.equal(status, 0);
      const rows = JSON.parse(stdout);
      assert.equal(rows.find(r => r.state === 'rest').match, true);
      assert.equal(rows.find(r => r.state === 'rest').found.background, '#312e29');
    });

    describe('a region (P3.5)', () => {
      const boxes = join(folder, 'boxes');
      mkdirSync(boxes, { recursive: true });
      // A check box 120 x 24 on tone 2, its box 16 x 16 of accent at 4,4.
      const pixels = new Uint8Array(120 * 24 * 4);
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 120; x++) {
          const c = x >= 4 && x < 20 && y >= 4 && y < 20 ? '#d1b072' : '#25221f';
          pixels.set([ 1, 3, 5 ].map(i => parseInt(c.slice(i, i + 2), 16)).concat(255), (y * 120 + x) * 4);
        }
      }
      writeFileSync(join(boxes, 'check-box-checked.png'), encodePng({ width: 120, height: 24, pixels }));
      writeFileSync(join(boxes, 'manifest.json'), JSON.stringify([ { file: 'check-box-checked.png', widget: 'check-box', state: 'checked', reached: true } ]));
      writeFileSync(join(boxes, 'expect.json'), JSON.stringify([ { state: 'checked', background: { hex: '#d1b072', tokens: [] }, text: null } ]));
      const bdir = relative(root, boxes);
      const expect = join(bdir, 'expect.json');

      it('reads only the region, and leaves an expected text of null uncompared', () => {
        const { status, stdout } = image('states', bdir, '--case', 'check-box', '--expect', expect, '--region', '4,4,16,16');
        assert.equal(status, 0, stdout);
        assert.match(stdout, /checked\s+ok\s+#d1b072 \(accent\) \/ —/);
      });

      it('fails without the region, naming the fill', () => {
        const { status, stdout } = image('states', bdir, '--case', 'check-box', '--expect', expect);
        assert.equal(status, 1, stdout);
        assert.match(stdout, /checked\s+background #25221f.*expected #d1b072/);
      });

      it('wants a region of four numbers', () => {
        assert.equal(image('states', bdir, '--case', 'check-box', '--expect', expect, '--region', '4,4,16').status, 2);
      });
    });

    describe('a focus bar (P3.4)', () => {
      const wells = join(folder, 'wells');
      mkdirSync(wells, { recursive: true });
      // A well 4 px wide and 6 px high: dim text in the middle, its foot 3 px high.
      const well = (fillHex, footHex) => {
        const pixels = new Uint8Array(4 * 6 * 4);
        for (let y = 0; y < 6; y++) {
          for (let x = 0; x < 4; x++) {
            const c = y >= 3 ? footHex : (x === 1 && y === 1 ? '#a9a297' : fillHex);
            pixels.set([ 1, 3, 5 ].map(i => parseInt(c.slice(i, i + 2), 16)).concat(255), (y * 4 + x) * 4);
          }
        }
        return encodePng({ width: 4, height: 6, pixels });
      };
      writeFileSync(join(wells, 'line-edit-rest.png'), well('#151413', '#151413'));
      writeFileSync(join(wells, 'line-edit-focused.png'), well('#1c1a18', '#d1b072'));
      writeFileSync(join(wells, 'manifest.json'), JSON.stringify([
        { file: 'line-edit-rest.png', widget: 'line-edit', state: 'rest', reached: true },
        { file: 'line-edit-focused.png', widget: 'line-edit', state: 'focused', reached: true }
      ]));
      writeFileSync(join(wells, 'expect.json'), JSON.stringify([ state('rest', '#151413', '#a9a297'), state('focused', '#1c1a18', '#a9a297') ]));
      const wdir = relative(root, wells);
      const expect = join(wdir, 'expect.json');

      it('passes when only the bar states have the bar', () => {
        const { status, stdout } = image('states', wdir, '--case', 'line-edit', '--expect', expect, '--foot', '3', '--bar', '#d1b072', '--bar-states', 'focused');
        assert.equal(status, 0, stdout);
      });

      it('fails when a state has the wrong foot, naming it', () => {
        const { status, stdout } = image('states', wdir, '--case', 'line-edit', '--expect', expect, '--foot', '3', '--bar', '#d1b072', '--bar-states', 'rest');
        assert.equal(status, 1, stdout);
        assert.match(stdout, /rest\s+foot #151413.*expected #d1b072/);
        assert.match(stdout, /focused\s+foot #d1b072.*expected #1c1a18/);
      });

      it('wants --foot with --bar, and --bar with --bar-states', () => {
        assert.equal(image('states', wdir, '--case', 'line-edit', '--expect', expect, '--bar', '#d1b072').status, 2);
        assert.equal(image('states', wdir, '--case', 'line-edit', '--expect', expect, '--foot', '3', '--bar-states', 'focused').status, 2);
      });
    });

    it('wants a case', () => {
      const { status, stderr } = image('states', dir, '--expect', join(dir, 'good.json'));
      assert.equal(status, 2);
      assert.match(stderr, /--case/);
    });
  });
});
