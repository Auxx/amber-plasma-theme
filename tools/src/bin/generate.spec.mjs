import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));

/** Runs the tool from the repository root. It is never run with --write here. */
function generate(...args) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [ 'tools/src/bin/generate.mjs', ...args ], {
    cwd: root,
    encoding: 'utf8'
  });
  return { status, stdout, stderr };
}

describe('generate tool', () => {
  it('prints the colour scheme', () => {
    const { status, stdout } = generate('colour-scheme');
    assert.equal(status, 0);
    assert.ok(stdout.startsWith('# SPDX-FileCopyrightText'));
    assert.ok(stdout.includes('[Colors:View]'));
    assert.ok(stdout.endsWith('\n') && !stdout.endsWith('\n\n'));
  });

  it('prints the same text twice', () => {
    assert.equal(generate('colour-scheme').stdout, generate('colour-scheme').stdout);
  });

  it('reports in JSON', () => {
    const { status, stdout } = generate('colour-scheme', '--json');
    assert.equal(status, 0);
    const report = JSON.parse(stdout);
    assert.equal(report.part, 'colour-scheme');
    assert.equal(report.file, 'parts/colour-scheme/Amber.colors');
    assert.equal(report.written, false);
    assert.equal(typeof report.changed, 'boolean');
    assert.equal(report.content, generate('colour-scheme').stdout);
  });

  it('prints the terminal colours', () => {
    const { status, stdout } = generate('terminal-colours');
    assert.equal(status, 0);
    assert.ok(stdout.includes('[Color0Intense]'));
    assert.ok(stdout.includes('Description=Amber'));
  });

  it('prints a part with trial token values from --set, as tokens try does (P4.1)', () => {
    const { status, stdout } = generate('terminal-colours', '--set', 'ansi-white=#c2bdb5', '--set', 'ansi-bright-black=#78746d');
    assert.equal(status, 0);
    assert.match(stdout, /\[Color7\]\nColor=194,189,181\n/);
    assert.match(stdout, /\[Color0Intense\]\nColor=120,116,109\n/);
  });

  it('refuses --set with --write, so that a trial never reaches a part', () => {
    assert.equal(generate('terminal-colours', '--set', 'ansi-white=#c2bdb5', '--write').status, 2);
  });

  it('rejects an unknown part', () => {
    assert.equal(generate('wallpaper').status, 2);
  });
});
