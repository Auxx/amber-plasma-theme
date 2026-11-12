import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { PARTS, writePart } from './generate.mjs';

describe('generate', () => {
  const folder = mkdtempSync(join(tmpdir(), 'amber-generate-'));
  after(() => rmSync(folder, { recursive: true, force: true }));

  it('knows the colour scheme', () => {
    assert.ok(PARTS['colour-scheme'].file.endsWith('parts/colour-scheme/Amber.colors'));
    assert.ok(PARTS['colour-scheme'].generate().includes('[Colors:View]'));
  });

  it('writes a new file', () => {
    const file = join(folder, 'new.colors');
    assert.deepEqual(writePart(file, 'a\n'), { changed: true });
    assert.equal(readFileSync(file, 'utf8'), 'a\n');
  });

  it('leaves an equal file alone', () => {
    const file = join(folder, 'equal.colors');
    writeFileSync(file, 'a\n');
    const before = statSync(file).mtimeMs;
    assert.deepEqual(writePart(file, 'a\n'), { changed: false });
    assert.equal(statSync(file).mtimeMs, before);
  });

  it('rewrites a different file', () => {
    const file = join(folder, 'different.colors');
    writeFileSync(file, 'a\n');
    assert.deepEqual(writePart(file, 'b\n'), { changed: true });
    assert.equal(readFileSync(file, 'utf8'), 'b\n');
  });
});
