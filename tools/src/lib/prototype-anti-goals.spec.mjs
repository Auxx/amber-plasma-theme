import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { cssOffences, pageOffences } from './prototype-check.mjs';

/**
 * The anti-goals, checked in the prototype's real files with
 * prototype-check.mjs. The tokens file itself is checked by the contrast
 * pairs.
 */

const PROTOTYPE = fileURLToPath(new URL('../../../prototype/', import.meta.url));

const read = name => readFileSync(join(PROTOTYPE, name), 'utf8');

const stylesheets = readdirSync(PROTOTYPE)
  .filter(name => name.endsWith('.css') && name !== 'tokens.css')
  .sort();

const page = read('index.html');

describe('prototype anti-goals', () => {
  it('finds the page and its stylesheets', () => {
    assert.ok(stylesheets.includes('window.css') && stylesheets.includes('shell.css'), stylesheets.join(', '));
    const links = [ ...page.matchAll(/<link rel="stylesheet" href="([^"]+)">/g) ].map(m => m[1]);
    assert.deepEqual(links, [ 'tokens.css', 'window.css', 'shell.css' ]);
  });

  it('breaks no anti-goal in the stylesheets', () => {
    assert.deepEqual(stylesheets.flatMap(name => cssOffences(name, read(name))), []);
  });

  it('breaks no anti-goal in the page', () => {
    assert.deepEqual(pageOffences('index.html', page), []);
  });
});
