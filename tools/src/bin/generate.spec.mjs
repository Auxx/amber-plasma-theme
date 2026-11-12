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

  it('rejects an unknown part', () => {
    assert.equal(generate('wallpaper').status, 2);
  });
});
