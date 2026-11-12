import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The Union style (roadmap P3.1): a copy of KDE's Breeze style in
 * parts/union-style/amber/. Union takes the identifier from the folder's
 * name. These checks keep the folder installable while later plans edit it:
 * a broken @import or url() is not reported by Union, and a missing image
 * can abort a Qt Widgets application.
 */

const STYLE = fileURLToPath(new URL('../../../parts/union-style/amber/', import.meta.url));
const CSS = join(STYLE, 'contents/css');

const cssFiles = () => (existsSync(CSS) ? readdirSync(CSS).filter((f) => f.endsWith('.css')) : []);
const read = (file) => readFileSync(join(CSS, file), 'utf8');

describe('the Union style folder', () => {
  it('has metadata naming it Amber', () => {
    const meta = JSON.parse(readFileSync(join(STYLE, 'metadata.json'), 'utf8'));
    assert.equal(meta.name, 'Amber');
    assert.equal(meta['input-type'], 'css');
    assert.ok(typeof meta.version === 'string' && meta.version.length > 0, 'version');
    assert.ok(typeof meta.license === 'string' && meta.license.length > 0, 'license');
    assert.equal('hidden' in meta, false, 'the style must not be hidden');
  });

  it('has style.css and resolves every @import', () => {
    assert.ok(existsSync(join(CSS, 'style.css')), 'contents/css/style.css');
    for (const file of cssFiles()) {
      for (const [, target] of read(file).matchAll(/@import\s+"([^"]+)"/g)) {
        assert.ok(existsSync(join(CSS, target)), `${file} imports ${target}, which does not exist`);
      }
    }
  });

  it('resolves every url() from contents/css/', () => {
    for (const file of cssFiles()) {
      for (const [, target] of read(file).matchAll(/url\(\s*"([^"]+)"\s*\)/g)) {
        assert.ok(existsSync(resolve(CSS, target)), `${file} loads ${target}, which does not exist`);
      }
    }
  });

  it('keeps an SPDX header on every CSS file', () => {
    assert.ok(cssFiles().length > 0, 'no CSS files');
    for (const file of cssFiles()) {
      const head = read(file).match(/^\s*\/\*[\s\S]*?\*\//);
      assert.ok(head && head[0].includes('SPDX-License-Identifier:'), `${file} has no SPDX header`);
    }
  });

  it('carries the BSD 2-Clause licence of the Breeze style', () => {
    const licence = readFileSync(join(STYLE, 'LICENSE'), 'utf8');
    assert.match(licence, /BSD 2-Clause/);
    assert.match(licence, /Arjen Hiemstra/);
  });
});
