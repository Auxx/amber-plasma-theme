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

  it('fails on a file that is not a PNG', () => {
    writeFileSync(join(folder, 'not.png'), 'GIF89a');
    const { status, stderr } = image('greys', path('not.png'));
    assert.equal(status, 1);
    assert.match(stderr, /not a PNG/);
  });
});
