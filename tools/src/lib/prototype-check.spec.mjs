import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cssOffences, pageOffences, scriptOffences, warmthOffence } from './prototype-check.mjs';

const css = source => cssOffences('a.css', source);
const page = source => pageOffences('a.html', source);

describe('prototype check', () => {
  it('passes what the prototype may draw', () => {
    assert.deepEqual(
      css(`/* no cool grey, no white line */
:root {
  --desktop: #5c554b;
}
.window {
  outline: var(--outline-width) solid var(--outline);
  white-space: nowrap;
  background:
    linear-gradient(to top, var(--light), transparent) top / 1px 1px no-repeat;
}
.title { border: none; border-radius: 0; text-decoration: none; color: var(--text); }
`),
      []
    );
  });

  it('finds named colours, cool greys among them', () => {
    for (const value of [ 'slategray', 'lightslategrey', 'gainsboro', 'whitesmoke', 'white', 'steelblue', 'red' ]) {
      assert.deepEqual(css(`.x {\n  color: ${value};\n}`), [ `a.css:2: color: ${value}` ], value);
    }
    assert.deepEqual(css('.x { background: #888; fill: rgb(1 2 3); }').length, 2);
  });

  it('reads a declaration split over lines', () => {
    assert.deepEqual(css('.x {\n  box-shadow:\n    0 0 2px var(--accent);\n}'), [ 'a.css:2: box-shadow: 0 0 2px var(--accent)' ]);
    assert.deepEqual(css('.x {\n  border-radius:\n    4px;\n}'), [ 'a.css:2: border-radius: 4px' ]);
  });

  it('finds every kind of line and rounding', () => {
    const offending = [
      'border-top: 1px solid var(--text)',
      'border-width: 1px',
      'outline-style: solid',
      'outline-width: 1px',
      '-webkit-box-shadow: 0 0 1px var(--text)',
      'column-rule: 1px solid var(--text)',
      'text-decoration: underline',
      'filter: drop-shadow(0 0 2px var(--accent))',
      'clip-path: inset(0 round 4px)',
      'border-radius: 2px 0'
    ];
    for (const declaration of offending) {
      assert.equal(css(`.x { ${declaration}; }`).length, 1, declaration);
    }
  });

  it('allows a round widget', () => {
    assert.deepEqual(css('.radio { border-radius: 50%; }'), []);
  });

  it('allows the window outline on the window alone', () => {
    assert.deepEqual(css('.tool { outline: var(--outline-width) solid var(--outline); }'), [
      'a.css:1: outline: var(--outline-width) solid var(--outline) (only .window has the window outline)'
    ]);
  });

  it('refuses rules it cannot read', () => {
    assert.equal(css('@media (width > 1px) { .x { color: var(--text); } }').length, 1);
  });

  it('keeps the page plain', () => {
    const source = `<!doctype html>
<!-- <script> in a comment is fine -->
<script></script>
<svg><rect rx="2"/><line x1="0"/><path stroke="slategray"/></svg>
<p style='color: red'>
<hr>
<div style="--x: 1px">#585248 in text is a caption, not paint</div>
<script src="x.js"></script>
<script src="x.js" defer>alert(1)</script>`;
    assert.deepEqual(page(source), [
      'a.html:3: <script',
      'a.html:4: rx=',
      'a.html:4: <line',
      'a.html:4: stroke="slategray"',
      'a.html:5: style: color: red',
      'a.html:6: <hr',
      'a.html:8: <script',
      'a.html:9: <script'
    ]);
  });

  it('closes the ways round the script rule', () => {
    const offending = [
      "el.style.setProperty('--thumb', 'var(--tone-1)');",
      "document.createElement('style');",
      'document.styleSheets[0].insertRule(rule);',
      'document.adoptedStyleSheets = [];',
      'const s = el.style;',
      'Object.assign(el.style, {});',
      "el['style'];",
      'el.checked = true;',
      'el.disabled = false;',
      "el.toggleAttribute('hidden');",
      "el.removeAttribute('hidden');",
      'el.dataset.state = 1;',
      "el.textContent = '';",
      "eval('1');",
      "new Function('1');",
      "const u = '//'; el.classList.add('is-hovered');",
      "el.attributeStyleMap.set('display', 'none');",
      "el['checked'] = true;",
      'el.click();',
      "el.ariaChecked = 'true';",
      'el.hidden = true;',
      'el.remove();',
      'el.animate([]);',
      "setTimeout('go()');",
      'new XMLHttpRequest();',
      "navigator.sendBeacon('/');"
    ];
    const declared = "const el = document.querySelector('.slider');\n";
    for (const line of offending) {
      assert.notDeepEqual(scriptOffences('a.js', declared + line), [], line);
    }
    assert.deepEqual(scriptOffences('a.js', `${declared}const u = '//'; el.style.setProperty('--value', \`\${el.value}%\`);`), []);
  });

  it('keeps inline scripts out of the page', () => {
    assert.deepEqual(page(`<input onclick="go()">\n<a href="javascript:go()">`), [
      'a.html:1: onclick',
      'a.html:2: href="javascript:go()"'
    ]);
    assert.deepEqual(page('<input onclick=go()>'), [ 'a.html:1: onclick' ]);
    assert.deepEqual(page('<a href=javascript:go()>'), [ 'a.html:1: href=javascript:go()' ]);
    assert.deepEqual(page('<a href="&#106;avascript:go()">'), [ 'a.html:1: href="&#106;avascript:go()"' ]);
  });

  it('reads tags in any case', () => {
    assert.deepEqual(page('<SCRIPT>x()</SCRIPT>\n<Style>p{}</Style>\n<HR>'), [
      'a.html:1: <script',
      'a.html:2: <style',
      'a.html:3: <hr'
    ]);
    assert.deepEqual(page('<SCRIPT src="gallery.js" defer></SCRIPT>'), [ 'a.html:1: <script' ]);
  });

  it('allows a linked script', () => {
    assert.deepEqual(page('<script src="gallery.js" defer></script>'), []);
  });

  it('lets a script set custom properties only', () => {
    const source = `// el.style.color = 'red' in a comment is fine
const el = document.querySelector('.slider');
el.style.setProperty('--value', '40%');
el.style.color = '#fff';
el.classList.add('is-hovered');
el.style.setProperty('color', 'red');`;
    assert.deepEqual(scriptOffences('a.js', source), [
      'a.js:4: .style.',
      'a.js:4: color',
      'a.js:4: #fff',
      'a.js:5: classList',
      'a.js:5: add',
      'a.js:6: .style.',
      'a.js:6: red'
    ]);
  });

  it('allows only the names a slider needs', () => {
    const source = `const fill = slider => {
  const min = Number(slider.min);
  slider.style.setProperty('--value', \`\${((slider.value - min) * 100) / (Number(slider.max) - min)}%\`);
};
for (const slider of document.querySelectorAll('.slider')) {
  fill(slider);
  slider.addEventListener('input', () => fill(slider));
}
window.addEventListener('pageshow', () => document.querySelectorAll('.slider').forEach(fill));`;
    assert.deepEqual(scriptOffences('a.js', source), []);
    assert.deepEqual(scriptOffences('a.js', 'const s = document.body; s.click();'), [ 'a.js:1: body', 'a.js:1: click' ]);
    assert.deepEqual(scriptOffences('a.js', "const s = window; s['checked'] = 1;"), [ 'a.js:1: [' ]);
    assert.deepEqual(scriptOffences('a.js', 'const s = window; `${s.hidden}`;'), [ 'a.js:1: hidden' ]);
  });

  it('lets a candidate set a warm colour, and no one else', () => {
    assert.deepEqual(page('<figure class="candidate" style="--outline: #585248; --shadow: rgb(0 0 0 / 80%)">'), []);
    assert.deepEqual(page('<figure class="candidate" style="--outline: #8a8f99">'), [
      'a.html:1: not warm: #8a8f99 (hue 264, my call: warm is 30 to 110)'
    ]);
    assert.deepEqual(page('<div style="--outline: #585248">'), [ 'a.html:1: colour outside a candidate: --outline: #585248' ]);
  });

  it('judges warmth', () => {
    assert.equal(warmthOffence('#5c554b'), null);
    assert.equal(warmthOffence('rgb(0 0 0 / 50%)'), null);
    assert.match(warmthOffence('#888888'), /not warm: #888888 \(a grey with no hue/);
    assert.match(warmthOffence('slategray'), /not warm: slategray \(hue 2\d\d/);
  });
});
