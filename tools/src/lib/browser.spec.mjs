import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { nameColour, outPath, pageUrl, parseCssColour, tokenNames } from './browser.mjs';
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
    assert.equal(outPath(undefined, { name: 'scene', root }), join(root, 'tmp', 'scene.png'));
    assert.equal(outPath('shots/a.png', { name: 'x', root }), join(root, 'shots', 'a.png'));
    assert.equal(outPath('/tmp/a.png', { name: 'x', root, home: '/home/someone' }), '/tmp/a.png');
  });

  it('refuses where a screenshot may not go', () => {
    const home = dirname(root);
    assert.throws(() => outPath('a.jpg', { name: 'x', root, home }), usage(/Not a .png file/));
    assert.throws(() => outPath(join(home, 'a.png'), { name: 'x', root, home }), usage(/home folder outside the repository/));
    assert.throws(() => outPath('../a.png', { name: 'x', root, home }), usage(/home folder outside the repository/));
  });

  it('reads computed colours', () => {
    assert.deepEqual(parseCssColour('rgb(28, 26, 24)'), { r: 28, g: 26, b: 24, alpha: 1 });
    assert.equal(parseCssColour('rgba(0, 0, 0, 0.5)').alpha, 0.5);
    assert.throws(() => parseCssColour('red'), /Not a computed colour: red/);
  });

  it('names colours as tokens', () => {
    const names = tokenNames(loadTokens());
    assert.equal(nameColour('rgb(28, 26, 24)', names), '#1c1a18 (tone-1)');
    assert.equal(nameColour('rgb(60, 56, 50)', names), '#3c3832 (tone-4, outline)');
    assert.equal(nameColour('rgb(1, 2, 3)', names), '#010203');
    assert.equal(nameColour('rgba(0, 0, 0, 0)', names), 'transparent');
    assert.equal(nameColour('rgba(209, 176, 114, 0.28)', names), 'rgb(209 176 114 / 28%)');
    const all = [ ...names.values() ].flat();
    assert.ok(!all.includes('glow') && !all.includes('shadow'), all.join(', '));
  });
});
