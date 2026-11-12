import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));

/** Runs the tool from the repository root. */
function tokens(...args) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [ 'tools/src/bin/tokens.mjs', ...args ], {
    cwd: root,
    encoding: 'utf8'
  });
  return { status, stdout: stdout.trim(), stderr };
}

describe('tokens tool', () => {
  it('lists tokens', () => {
    const { status, stdout } = tokens('list');
    assert.equal(status, 0);
    assert.ok(stdout.includes('tone-0'));
    assert.ok(stdout.includes('#151413'));
  });

  it('filters the list', () => {
    const { status, stdout } = tokens('list', 'text', '--json');
    assert.equal(status, 0);
    assert.deepEqual(JSON.parse(stdout).map(row => row.name), [ 'text', 'text-dim', 'text-selection', 'terminal-text' ]);
  });

  it('resolves a token', () => {
    // A name written with its leading -- goes after the -- separator.
    const { status, stdout } = tokens('resolve', '--json', '--', '--tone-2');
    assert.equal(status, 0);
    const [ row ] = JSON.parse(stdout);
    assert.equal(row.token, 'tone-2');
    assert.equal(row.hex, '#25221f');
    assert.deepEqual(row.chain, [ 'tone-2' ]);
  });

  it('lists lengths and mixes', () => {
    const { status, stdout } = tokens('list', '--json');
    assert.equal(status, 0);
    const values = Object.fromEntries(JSON.parse(stdout).map(row => [ row.name, row.value ]));
    assert.equal(values['outline-width'], '1px');
    assert.equal(values.glow, 'color-mix(in srgb, var(--accent) 14%, transparent)');
    assert.equal(values.shadow, '#000000 / 55%');
  });

  it('refuses to resolve a length', () => {
    const { status, stderr } = tokens('resolve', 'outline-width');
    assert.equal(status, 1);
    assert.ok(stderr.includes('outline-width is a length (1px)'), stderr);
  });

  it('tries a stronger outline', () => {
    const { status, stdout } = tokens('try', 'outline=#746e63', '--json');
    assert.equal(status, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.changed.length, 3);
    assert.equal(result.failing, 0);
  });

  it('tries a darker well', () => {
    const { status, stdout } = tokens('try', 'well=#0c0a07', '--json');
    assert.equal(status, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.changed.length, 3);
    assert.equal(result.failing, 0);
  });

  it('fails the fill on a 3:1 track', () => {
    const { status, stdout } = tokens('try', 'track=#746e63', '--json');
    assert.equal(status, 1);
    const result = JSON.parse(stdout);
    assert.equal(result.failing, 2);
    const failing = result.changed.filter(c => c.after.status === 'fail').map(c => [ c.after.pair, c.after.ratio.toFixed(2) ]);
    assert.deepEqual(failing, [ [ 'accent on track', '2.45' ], [ 'text-dim on track', '2.00' ] ]);
  });

  it('names an unknown token', () => {
    const { status, stderr } = tokens('resolve', 'nope');
    assert.equal(status, 1);
    assert.ok(stderr.includes('Unknown token: nope'));
  });

  it('refuses resolve without tokens', () => {
    const { status, stderr } = tokens('resolve');
    assert.equal(status, 2);
    assert.ok(stderr.includes('Usage:'));
  });

  it('passes every pair', () => {
    const { status, stdout } = tokens('pairs');
    assert.equal(status, 0);
    assert.ok(stdout.includes('147 pairs, 0 failing, 0 close.'), stdout);
  });

  it('prints pairs as JSON', () => {
    const { status, stdout } = tokens('pairs', '--json');
    assert.equal(status, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.total, 147);
    assert.equal(result.failing, 0);
  });

  it('filters pairs', () => {
    const { status, stdout } = tokens('pairs', 'on-accent', '--json');
    assert.equal(status, 0);
    const { pairs } = JSON.parse(stdout);
    assert.equal(pairs.length, 3);
    assert.equal(pairs[0].ratio.toFixed(2), '8.72');
  });

  it('fails a pair under --set', () => {
    const { status, stdout } = tokens('pairs', '--set', 'text-dim=#9c958a', '--failing');
    assert.equal(status, 1);
    assert.ok(stdout.includes('text-dim on tone-4'));
    assert.ok(stdout.includes('FAIL'));
  });

  it('shows what a change does', () => {
    const { status, stdout } = tokens('try', 'text-dim=#9c958a', '--json');
    assert.equal(status, 1);
    const result = JSON.parse(stdout);
    assert.equal(result.failing, 4);
    assert.equal(result.changed.length, 18);
  });

  it('shows no change', () => {
    const { status, stdout } = tokens('try', 'accent=#d1b072');
    assert.equal(status, 0);
    assert.ok(stdout.includes('No pair changes.'));
  });

  it('refuses try without overrides', () => {
    const { status, stderr } = tokens('try');
    assert.equal(status, 2);
    assert.ok(stderr.includes('Usage:'));
  });

  it('refuses a malformed override', () => {
    const { status, stderr } = tokens('try', 'nonsense');
    assert.equal(status, 2);
    assert.ok(stderr.includes('Not an override'));
  });

  it('refuses to try a token that does not exist', () => {
    const { status, stderr } = tokens('try', 'txet-dim=#000');
    assert.equal(status, 1);
    assert.ok(stderr.includes('Unknown token: txet-dim'));
  });

  it('refuses to set a token that does not exist for pairs', () => {
    const { status, stderr } = tokens('pairs', '--set', 'txet-dim=#000');
    assert.equal(status, 1);
    assert.ok(stderr.includes('Unknown token: txet-dim'));
  });

  it('names a value that is not a colour', () => {
    const { status, stderr } = tokens('try', 'text=banana');
    assert.equal(status, 1);
    assert.ok(stderr.includes('banana'));
  });
});
