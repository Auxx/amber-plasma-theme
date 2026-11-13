import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { openPage, pageUrl } from './browser.mjs';
import { GLYPHS } from './decoration.mjs';

/**
 * The title bar of the prototype's windows draws what KWin draws with Amber's
 * decoration and KWin's default buttons (P5.2): the menu button, the
 * application's icon, at the left; the title centred between it and the
 * window buttons, as KWin centres it; minimise, maximise and close at the
 * right.
 */

const PAGES = [ 'prototype/index.html', 'prototype/gallery.html' ];
const source = page => readFileSync(fileURLToPath(new URL(`../../../${page}`, import.meta.url)), 'utf8');

/** Each title bar of a page as the list of its children's first class, in order. */
const titleBars = page => [ ...source(page).matchAll(/<div class="title-bar">([\s\S]*?)<\/div>/g) ]
  .map(([ , body ]) => [ ...body.matchAll(/<span class="([a-z-]+)[^"]*"/g) ].map(([ , name ]) => name))
  .map(names => names.filter(name => [ 'menu-button', 'title', 'window-buttons' ].includes(name)));

let chrome = {};
let opened;
before(async () => {
  try {
    opened = await openPage(pageUrl('prototype/index.html'));
  } catch (error) {
    chrome = { skip: error.message };
  }
});
after(() => opened?.browser.close());
const withChrome = (name, test) => it(name, t => (chrome.skip ? t.skip(chrome.skip) : test()));

describe('prototype window', () => {
  it('draws the menu button, the title and the window buttons on every title bar', () => {
    for (const page of PAGES) {
      const bars = titleBars(page);
      assert.ok(bars.length > 0, page);
      for (const bar of bars) {
        assert.deepEqual(bar, [ 'menu-button', 'title', 'window-buttons' ], page);
      }
    }
  });

  withChrome('centres the title between the menu button and the window buttons', async () => {
    const boxes = await opened.page.$$eval('.title-bar', bars => bars.map(bar => {
      const box = selector => bar.querySelector(selector).getBoundingClientRect();
      return { menu: box('.menu-button'), title: box('.title'), buttons: box('.window-buttons'), bar: bar.getBoundingClientRect() };
    }));
    assert.equal(boxes.length, 2);
    for (const { menu, title, buttons, bar } of boxes) {
      assert.equal(menu.left, bar.left);
      assert.equal(buttons.right, bar.right);
      const centre = title.left + title.width / 2;
      assert.ok(Math.abs(centre - (menu.right + buttons.left) / 2) <= 0.5, `title centre ${centre}`);
    }
  });

  withChrome("draws the application's icon 26 px across, 2 px in from the menu button's edges", async () => {
    const boxes = await opened.page.$$eval('.menu-button', buttons => buttons.map(button => {
      const outer = button.getBoundingClientRect();
      const icon = button.querySelector('svg').getBoundingClientRect();
      return { outer: [ outer.width, outer.height ], icon: [ icon.width, icon.height, icon.left - outer.left, icon.top - outer.top ] };
    }));
    for (const { outer, icon } of boxes) {
      assert.deepEqual(outer, [ 30, 30 ]);
      assert.deepEqual(icon, [ 26, 26, 2, 2 ]);
    }
  });

  it('draws the windows of the gallery on known backdrops (P5.3)', () => {
    const gallery = source('prototype/gallery.html');
    for (const state of [ 'active', 'inactive', 'maximised' ]) {
      assert.match(gallery, new RegExp(`data-window="${state}"`), state);
    }
  });

  withChrome('draws a maximised window with no outline, no light and restore (P5.3)', async () => {
    const { browser, page } = await openPage(pageUrl('prototype/gallery.html'));
    try {
      const seen = await page.$eval('[data-window="maximised"] .window', w => ({
        outline: getComputedStyle(w).outlineStyle,
        light: getComputedStyle(w, '::before').content,
        glyphs: [ ...w.querySelectorAll('.window-button path') ].map(p => p.getAttribute('d')),
        box: [ w.getBoundingClientRect(), w.parentElement.getBoundingClientRect() ].map(r => [ r.left, r.top, r.width, r.height ])
      }));
      assert.equal(seen.outline, 'none');
      assert.equal(seen.light, 'none');
      assert.ok(seen.glyphs.includes(GLYPHS.restore));
      assert.ok(!seen.glyphs.includes(GLYPHS.maximize));
      assert.deepEqual(seen.box[0], seen.box[1]);
      const active = await page.$eval('[data-window="active"] .window', w => getComputedStyle(w).outlineStyle);
      assert.equal(active, 'solid');
    } finally {
      await browser.close();
    }
  });
});
