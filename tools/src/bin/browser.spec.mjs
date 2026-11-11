import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { openPage, pageUrl } from '../lib/browser.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'amber-shots-'));
const PNG = Buffer.from([ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ]);

/** Runs the tool from the repository root. */
function browser(...args) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [ 'tools/src/bin/browser.mjs', ...args ], {
    cwd: root,
    encoding: 'utf8'
  });
  return { status, stdout: stdout.trim(), stderr };
}

// The tests that need Chrome are skipped, with the reason, when it cannot start.
let chrome = {};
before(async () => {
  try {
    const { browser: opened } = await openPage(pageUrl('prototype/index.html'));
    await opened.close();
  } catch (error) {
    chrome = { skip: error.message };
  }
});

after(() => rmSync(out, { recursive: true, force: true }));

const withChrome = (name, test) => it(name, t => (chrome.skip ? t.skip(chrome.skip) : test()));

describe('browser tool', () => {
  withChrome('checks the prototype', () => {
    const { status, stdout } = browser('check', 'prototype/index.html');
    assert.equal(status, 0, stdout);
    assert.ok(stdout.endsWith('0 load problems, 0 anti-goal offences.'), stdout);
  });

  withChrome('finds what is broken', () => {
    const { status, stdout } = browser('check', 'tools/src/bin/fixtures/broken-page.html', '--json');
    assert.equal(status, 1);
    const { problems, offences } = JSON.parse(stdout);
    assert.equal(problems.filter(p => p.includes('missing.css')).length, 1, problems.join('\n'));
    assert.ok(problems.includes('console: boom'), problems.join('\n'));
    assert.equal(problems.length, 2, problems.join('\n'));
    assert.ok(offences.some(o => o.startsWith('div.lined: border-top')), offences.join('\n'));
    assert.ok(offences.some(o => o.startsWith('a: text-decoration-line underline')), offences.join('\n'));
  });

  withChrome('names hovered colours', () => {
    const close = '.scene-front .is-close';
    const { status, stdout } = browser('colours', 'prototype/index.html', close, '--hover', close, '--json');
    assert.equal(status, 0);
    const rows = JSON.parse(stdout);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].background, '#b5442f (danger)');
    assert.equal(rows[0].colour, '#fbf3e6 (on-danger)');
  });

  withChrome('names colours at rest', () => {
    const { status, stdout } = browser('colours', 'prototype/index.html', '.scene-front .is-minimise', '--json');
    assert.equal(status, 0);
    const [ row ] = JSON.parse(stdout);
    assert.equal(row.background, 'transparent');
    assert.equal(row.colour, '#e8e3da (text)');
  });

  withChrome('saves an element', () => {
    const file = join(out, 'front.png');
    const { status, stdout } = browser('shot', 'prototype/index.html', '--selector', '.scene-front', '--out', file, '--json');
    assert.equal(status, 0, stdout);
    const result = JSON.parse(stdout);
    assert.equal(result.width, 900);
    assert.equal(result.height, 560);
    assert.deepEqual(readFileSync(file).subarray(0, 8), PNG);
  });

  withChrome('saves a hovered state by default name', () => {
    const close = '.scene-front .is-close';
    // A screenshot of that name the owner saved is put back afterwards.
    const kept = join(root, 'tmp/index-scene-front-is-close-hover.png');
    const before = existsSync(kept) ? readFileSync(kept) : null;
    try {
      const { status, stdout } = browser('shot', 'prototype/index.html', '--selector', close, '--hover', close, '--json');
      assert.equal(status, 0, stdout);
      const { path } = JSON.parse(stdout);
      assert.equal(path, 'tmp/index-scene-front-is-close-hover.png');
      assert.ok(existsSync(join(root, path)));
    } finally {
      if (before) {
        writeFileSync(kept, before);
      } else {
        rmSync(kept, { force: true });
      }
    }
  });

  withChrome('hides scrollbars unless asked', async () => {
    const gutter = async options => {
      const { browser: opened, page } = await openPage(pageUrl('prototype/gallery.html'), options);
      try {
        return await page.locator('.scroll-area').evaluate(element => element.offsetWidth - element.clientWidth);
      } finally {
        await opened.close();
      }
    };
    assert.equal(await gutter({}), 0);
    assert.equal(await gutter({ scrollbars: true }), 12);
  });

  withChrome('saves a page with its scrollbars', () => {
    const file = join(out, 'scroll.png');
    const { status, stdout } = browser('shot', 'prototype/gallery.html', '--selector', '.scroll-area', '--scrollbars', '--out', file, '--json');
    assert.equal(status, 0, stdout);
    assert.deepEqual(readFileSync(file).subarray(0, 8), PNG);
  });

  withChrome('waits before a shot', () => {
    // A wait can only make the command slower, so this holds on any machine.
    const shot = (...extra) => {
      const begun = Date.now();
      const { status, stdout } = browser('shot', 'prototype/index.html', '--out', join(out, 'wait.png'), ...extra);
      assert.equal(status, 0, stdout);
      return Date.now() - begun;
    };
    const plain = shot();
    const waited = shot('--wait', '1500');
    assert.ok(waited >= 1500, `waited ${waited} ms`);
    assert.ok(waited > plain, `waited ${waited} ms, plain ${plain} ms`);
  });

  it('refuses a bad wait', () => {
    const { status, stderr } = browser('shot', 'prototype/gallery.html', '--wait', 'soon');
    assert.equal(status, 2);
    assert.match(stderr, /--wait must be a whole number of milliseconds from 0 to 10000: soon/);
  });

  withChrome('refuses an ambiguous state', () => {
    const { status, stderr } = browser('colours', 'prototype/index.html', '.window', '--hover', '.window-button');
    assert.equal(status, 1);
    assert.ok(stderr.includes('.window-button matches 6 elements'), stderr);
  });

  it('refuses a missing page', () => {
    const { status, stderr } = browser('check', 'nope.html');
    assert.equal(status, 1);
    assert.ok(stderr.includes('No such page: nope.html'), stderr);
  });

  it('refuses a home path', () => {
    const { status, stderr } = browser('shot', 'prototype/index.html', '--out', join(homedir(), 'a.png'));
    assert.equal(status, 2);
    assert.ok(stderr.includes('outside the repository and the temporary folder'), stderr);
  });

  withChrome('allows round widgets and finds ovals', () => {
    const { status, stdout } = browser('check', 'tools/src/bin/fixtures/round-page.html', '--json');
    assert.equal(status, 1);
    const { problems, offences } = JSON.parse(stdout);
    assert.deepEqual(problems, []);
    assert.deepEqual(offences, [ 'div.oval: border-radius 50%' ]);
  });

  withChrome('finds a line drawn as a box', () => {
    const { status, stdout } = browser('check', 'tools/src/bin/fixtures/line-page.html', '--json');
    assert.equal(status, 1);
    const { problems, offences } = JSON.parse(stdout);
    assert.deepEqual(problems, []);
    assert.deepEqual(offences, [ 'div.rule: a line 200 × 1 px', 'div.post: a line 2 × 40 px', 'div.divider::after: a line 1 × 20 px' ]);
  });

  withChrome('checks a page in a state', () => {
    const { status, stdout } = browser('check', 'tools/src/bin/fixtures/round-page.html', '--focus', '.plain', '--json');
    assert.equal(status, 1);
    const { offences } = JSON.parse(stdout);
    assert.ok(offences.some(o => o.startsWith('button.plain: outline')), offences.join('\n'));
  });

  it('refuses a bad size', () => {
    const { status, stderr } = browser('check', 'prototype/index.html', '--width', '12');
    assert.equal(status, 2);
    assert.ok(stderr.includes('--width'), stderr);
  });
});
