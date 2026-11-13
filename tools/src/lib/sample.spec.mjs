import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { terminalSampleToAnsi } from './sample.mjs';

const pre = body => `<p>before</p><pre class="terminal">${body}</pre><pre class="terminal">second</pre>`;

describe('terminalSampleToAnsi', () => {
  it('colours a span', () => {
    assert.equal(terminalSampleToAnsi(pre('<span class="ansi-red">M</span>')), '\x1b[31mM\x1b[0m');
  });

  it('adds a background', () => {
    assert.equal(terminalSampleToAnsi(pre('<span class="ansi-black on-green"> PASS </span>')), '\x1b[30;42m PASS \x1b[0m');
  });

  it('uses bright codes', () => {
    assert.equal(terminalSampleToAnsi(pre('<span class="ansi-bright-blue">~</span>')), '\x1b[94m~\x1b[0m');
  });

  it('decodes entities', () => {
    assert.equal(terminalSampleToAnsi(pre('latest -&gt; docs/ &lt;&amp;&gt;')), 'latest -> docs/ <&>');
  });

  it('keeps plain text and line breaks', () => {
    assert.equal(terminalSampleToAnsi(pre('a\n<span class="ansi-green">b</span> c')), 'a\n\x1b[32mb\x1b[0m c');
  });

  it('refuses an unknown class', () => {
    assert.throws(() => terminalSampleToAnsi(pre('<span class="ansi-black on-white">x</span>')), /on-white/);
  });

  it('refuses a nested span', () => {
    assert.throws(() => terminalSampleToAnsi(pre('<span class="ansi-red"><span class="ansi-blue">x</span></span>')), /nested/);
  });

  it('refuses a page with no terminal sample', () => {
    assert.throws(() => terminalSampleToAnsi('<p>none</p>'), /no <pre class="terminal">/);
  });
});
