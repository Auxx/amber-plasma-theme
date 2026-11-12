import assert from 'node:assert/strict';
import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { isTokenColour, nameColour, outPath, pageUrl, parseCssColour, tokenNames } from './browser.mjs';
import { UsageError } from './cli.mjs';
import { loadTokens } from './tokens.mjs';

const root = mkdtempSync(join(tmpdir(), 'amber-browser-'));
writeFileSync(join(root, 'page.html'), '<!doctype html>');

const usage = pattern => error => error instanceof UsageError && pattern.test(error.message);

describe('browser', () => {
  it('turns a page into a file URL', () => {
    const url = pageUrl('page.html', root);
    assert.ok(url.startsWith('file://') && url.endsWith('/page.html'), url);
    assert.throws(() => pageUrl('nope.html', root), /No such page: nope.html/);
  });

  it('chooses where a screenshot goes', () => {
    const temp = mkdtempSync(join(tmpdir(), 'amber-temp-'));
    assert.equal(outPath(undefined, { name: 'scene', root, temp }), join(root, 'tmp', 'scene.png'));
    assert.equal(outPath('shots/a.png', { name: 'x', root, temp }), join(root, 'shots', 'a.png'));
    assert.equal(outPath('..a.png', { name: 'x', root, temp }), join(root, '..a.png'));
    assert.equal(outPath(join(temp, 'a.png'), { name: 'x', root, temp }), join(temp, 'a.png'));
  });

  it('refuses where a screenshot may not go', () => {
    const temp = mkdtempSync(join(tmpdir(), 'amber-temp-'));
    const outside = usage(/Will not write outside the repository and the temporary folder/);
    assert.throws(() => outPath('a.jpg', { name: 'x', root, temp }), usage(/Not a .png file/));
    assert.throws(() => outPath('../a.png', { name: 'x', root, temp }), outside);
    assert.throws(() => outPath('/usr/a.png', { name: 'x', root, temp }), outside);
    assert.throws(() => outPath(join(homedir(), 'a.png'), { name: 'x', root, temp }), outside);
  });

  it('follows links before deciding', () => {
    const temp = mkdtempSync(join(tmpdir(), 'amber-temp-'));
    const away = mkdtempSync(join(tmpdir(), 'amber-away-'));
    symlinkSync(away, join(root, 'escape'));
    assert.throws(
      () => outPath('escape/a.png', { name: 'x', root, temp }),
      usage(/Will not write outside the repository and the temporary folder/)
    );
  });

  it('reads computed colours', () => {
    assert.deepEqual(parseCssColour('rgb(28, 26, 24)'), { r: 28, g: 26, b: 24, alpha: 1 });
    assert.equal(parseCssColour('rgba(0, 0, 0, 0.5)').alpha, 0.5);
    assert.throws(() => parseCssColour('banana'), /Not a computed colour: banana/);
  });

  it('names colours as tokens', () => {
    const names = tokenNames(loadTokens());
    assert.equal(nameColour('rgb(28, 26, 24)', names), '#1c1a18 (tone-1, well-focus, editor-gutter)');
    assert.equal(nameColour('rgb(60, 56, 50)', names), '#3c3832 (tone-4, thumb)');
    assert.equal(nameColour('rgb(1, 2, 3)', names), '#010203');
    assert.equal(nameColour('rgba(0, 0, 0, 0)', names), 'transparent');
    assert.equal(nameColour('rgba(209, 176, 114, 0.28)', names), 'rgb(209 176 114 / 28%)');
    assert.equal(nameColour('color(srgb 0.819608 0.690196 0.447059 / 0.28)', names), 'rgb(209 176 114 / 28%)');
    assert.equal(nameColour('color(srgb 0.819608 0.690196 0.447059)', names), '#d1b072 (accent, well-focus-edge, ansi-yellow, syntax-preprocessor)');
    assert.match(nameColour('oklch(0.5 0.02 80)', names), /^#[0-9a-f]{6}$/);
    const all = [ ...names.values() ].flat();
    assert.ok(!all.includes('glow') && !all.includes('shadow'), all.join(', '));
  });

  it('names a colour as any of its tokens', () => {
    const names = tokenNames(loadTokens());
    assert.equal(isTokenColour('rgb(232, 227, 218)', 'text', names), true);
    assert.equal(isTokenColour('rgb(232, 227, 218)', 'ansi-white', names), true);
    assert.equal(isTokenColour('rgb(232, 227, 218)', 'text-dim', names), false);
    assert.equal(isTokenColour('rgba(0, 0, 0, 0)', 'transparent', names), true);
  });
});
