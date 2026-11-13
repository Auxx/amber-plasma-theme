import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));

function sample(...args) {
  return spawnSync(process.execPath, [ 'tools/src/bin/sample.mjs', ...args ], { cwd: root, encoding: 'utf8' });
}

describe('sample tool', () => {
  it("prints the prototype's sample", () => {
    const { status, stdout } = sample('terminal');
    assert.equal(status, 0);
    assert.ok(stdout.includes('\x1b[92maux@forge'));
    assert.ok(stdout.endsWith('\n'));
  });

  it('refuses a sample it cannot read', () => {
    const { status, stderr } = sample('terminal', '--file', 'tools/src/bin/fixtures/unknown-class-sample.html');
    assert.equal(status, 1);
    assert.match(stderr, /ansi-pink/);
  });
});
