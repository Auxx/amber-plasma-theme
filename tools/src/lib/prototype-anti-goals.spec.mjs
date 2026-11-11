import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { cssOffences, pageOffences, scriptOffences } from './prototype-check.mjs';

/**
 * The anti-goals, checked in the prototype's real files with
 * prototype-check.mjs: every page and every stylesheet. The tokens file itself
 * is checked by the contrast pairs.
 */

const PROTOTYPE = fileURLToPath(new URL('../../../prototype/', import.meta.url));

const read = name => readFileSync(join(PROTOTYPE, name), 'utf8');

const files = readdirSync(PROTOTYPE).sort();
const stylesheets = files.filter(name => name.endsWith('.css') && name !== 'tokens.css');
const PAGES = files.filter(name => name.endsWith('.html'));
const scripts = files.filter(name => name.endsWith('.js'));

// The stylesheets each page links, in order. A new page is added here.
const LINKS = {
  'gallery.html': [ 'tokens.css', 'widgets.css', 'gallery.css' ],
  'index.html': [ 'tokens.css', 'window.css', 'shell.css' ]
};

// The scripts each page runs (D-48). A new page is added here.
const SCRIPTS = {
  'gallery.html': [ 'gallery.js' ],
  'index.html': []
};

describe('prototype anti-goals', () => {
  it('finds the pages and their stylesheets', () => {
    assert.deepEqual(PAGES, Object.keys(LINKS));
    for (const page of PAGES) {
      const links = [ ...read(page).matchAll(/<link rel="stylesheet" href="([^"]+)">/g) ].map(m => m[1]);
      assert.deepEqual(links, LINKS[page], page);
      for (const name of links) {
        assert.ok(files.includes(name), `${page} links a missing ${name}`);
      }
    }
  });

  it('breaks no anti-goal in the stylesheets', () => {
    assert.deepEqual(stylesheets.flatMap(name => cssOffences(name, read(name))), []);
  });

  it('breaks no anti-goal in any page', () => {
    assert.deepEqual(PAGES.flatMap(page => pageOffences(page, read(page))), []);
  });

  it('runs only the scripts it lists', () => {
    assert.deepEqual(PAGES, Object.keys(SCRIPTS));
    for (const page of PAGES) {
      const linked = [ ...read(page).matchAll(/<script src="([^"]+)"/g) ].map(m => m[1]);
      assert.deepEqual(linked, SCRIPTS[page], page);
      for (const name of linked) {
        assert.ok(files.includes(name), `${page} runs a missing ${name}`);
      }
    }
    assert.deepEqual(scripts, [ ...new Set(Object.values(SCRIPTS).flat()) ].sort());
  });

  it('breaks no anti-goal in the scripts', () => {
    assert.deepEqual(scripts.flatMap(name => scriptOffences(name, read(name))), []);
  });
});
