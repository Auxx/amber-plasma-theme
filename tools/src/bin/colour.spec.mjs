import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));

/** Runs the tool from the repository root. */
function colour(...args) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [ 'tools/src/bin/colour.mjs', ...args ], {
    cwd: root,
    encoding: 'utf8'
  });
  return { status, stdout: stdout.trim(), stderr };
}

describe('colour tool', () => {
  it('prints a ratio', () => {
    const { status, stdout } = colour('contrast', '#e8e3da', '#25221f');
    assert.equal(status, 0);
    assert.equal(stdout, '12.38:1');
  });

  it('passes above the minimum', () => {
    const { status, stdout } = colour('contrast', '#e8e3da', '#25221f', '--min', '4.5');
    assert.equal(status, 0);
    assert.ok(stdout.endsWith('pass'));
  });

  it('reports a close pass', () => {
    const { status, stdout } = colour('contrast', '#9c958a', '#312e29', '--min', '4.5');
    assert.equal(status, 0);
    assert.ok(stdout.includes('pass (close)'));
  });

  it('fails below the minimum', () => {
    const { status, stdout } = colour('contrast', '#e8e3da', '#b5442f', '--min', '4.5');
    assert.equal(status, 1);
    assert.ok(stdout.includes('FAIL (< 4.5)'));
  });

  it('prints JSON', () => {
    const { status, stdout } = colour('contrast', '#e8e3da', '#25221f', '--min', '4.5', '--json');
    assert.equal(status, 0);
    assert.deepEqual(JSON.parse(stdout), { ratio: 12.38, opaque: true, pass: true, close: false });
  });

  it('refuses a minimum that is not a number', () => {
    const { status, stderr } = colour('contrast', '#e8e3da', '#25221f', '--min', 'abc');
    assert.equal(status, 2);
    assert.ok(stderr.includes('Usage:'));
  });

  it('refuses a single value', () => {
    const { status, stderr } = colour('contrast', '#e8e3da');
    assert.equal(status, 2);
    assert.ok(stderr.includes('Usage:'));
  });

  it('names a value that is not a colour', () => {
    const { status, stderr } = colour('contrast', 'banana', '#000');
    assert.equal(status, 1);
    assert.ok(stderr.includes('banana'));
  });

  it('flags a background that is not opaque', () => {
    const { status, stdout } = colour('contrast', '#fff', 'rgb(0 0 0 / 50%)');
    assert.equal(status, 0);
    assert.ok(stdout.includes('not opaque'));
  });

  it('fails a minimum on a background that is not opaque', () => {
    const args = [ 'contrast', '#fff', 'rgb(0 0 0 / 50%)', '--min', '4.5' ];
    const text = colour(...args);
    assert.equal(text.status, 1);
    assert.ok(text.stdout.includes('FAIL'));
    assert.ok(text.stdout.includes('not opaque'));
    const json = colour(...args, '--json');
    assert.equal(json.status, 1);
    assert.equal(JSON.parse(json.stdout).pass, false);
    assert.equal(JSON.parse(json.stdout).opaque, false);
  });

  it('refuses to solve on a background that is not opaque', () => {
    const { status, stderr } = colour('solve', 'rgb(0 0 0 / 50%)', '--hue', '80', '--chroma', '0.02');
    assert.equal(status, 1);
    assert.ok(stderr.includes('not opaque'));
  });

  it('measures a part-transparent foreground as it is painted', () => {
    const { status, stdout } = colour('contrast', 'rgb(209 176 114 / 45%)', '#25221f');
    assert.equal(status, 0);
    assert.equal(stdout, '2.67:1');
  });

  it('converts a colour', () => {
    const { status, stdout } = colour('convert', '#d1b072', '--json');
    assert.equal(status, 0);
    const [ first ] = JSON.parse(stdout);
    assert.equal(first.hex, '#d1b072');
    assert.equal(first.inGamut, true);
  });

  it('refuses convert without values', () => {
    const { status, stderr } = colour('convert');
    assert.equal(status, 2);
    assert.ok(stderr.includes('Usage:'));
  });

  it('solves a lightness range', () => {
    const { status, stdout } = colour('solve', '#25221f', '--hue', '80', '--chroma', '0.02', '--min', '4.5', '--json');
    assert.equal(status, 0);
    const { ranges } = JSON.parse(stdout);
    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].to, 100);
  });

  it('prints usage without a command', () => {
    const { status, stdout } = colour();
    assert.equal(status, 2);
    assert.ok(stdout.includes('Usage:'));
  });
});
