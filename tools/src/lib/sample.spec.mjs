import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareEditorSample, editorSampleRuns, editorSampleText, highlightedRuns, terminalSampleToAnsi } from './sample.mjs';
import { parseTokens } from './tokens.mjs';

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

const code = body => `<div class="kate"><div class="code">\n${body}\n</div>\n</div>`;
const page = (body, colour = '#e6dfd3') =>
  `<!DOCTYPE html>\n<html><head></head><body style="background-color:#2c2a26;color:${colour}"><pre>\n${body}</pre></body></html>`;
const runsOf = runs => runs.map(({ line, char, token, colour }) => [ line, char, token ?? colour ]);

describe('editorSampleRuns', () => {
  it("reads the sample's runs", () => {
    assert.deepEqual(runsOf(editorSampleRuns(code('<span class="line"><span class="syn-keyword">if</span> x</span>'))), [
      [ 1, 'i', 'syntax-keyword' ], [ 1, 'f', 'syntax-keyword' ], [ 1, ' ', 'text' ], [ 1, 'x', 'text' ]
    ]);
  });

  it('passes a text selection and a search highlight through', () => {
    const runs = editorSampleRuns(code(
      '<span class="line"><span class="text-selection">a.<span class="syn-function">f</span></span> <span class="search-highlight">n</span></span>'
    ));
    assert.deepEqual(runsOf(runs).filter(([ , char ]) => char !== ' '), [
      [ 1, 'a', 'text' ], [ 1, '.', 'text' ], [ 1, 'f', 'syntax-function' ], [ 1, 'n', 'text' ]
    ]);
  });

  it('numbers the lines and decodes entities', () => {
    const runs = editorSampleRuns(code('<span class="line">a</span>\n<span class="line"></span>\n<span class="line">&lt;</span>'));
    assert.deepEqual(runsOf(runs), [ [ 1, 'a', 'text' ], [ 3, '<', 'text' ] ]);
  });

  it('refuses an unknown class', () => {
    assert.throws(() => editorSampleRuns(code('<span class="line"><span class="syn-macro">x</span></span>')), /syn-macro/);
  });
});

describe('editorSampleText', () => {
  it('ends every line with a newline', () => {
    assert.equal(editorSampleText(code('<span class="line">a</span>\n<span class="line"></span>')), 'a\n\n');
  });
});

describe('highlightedRuns', () => {
  it("reads the highlighter's runs", () => {
    assert.deepEqual(runsOf(highlightedRuns(page('<span style="color:#d79bb7">if</span> x'))), [
      [ 1, 'i', '#d79bb7' ], [ 1, 'f', '#d79bb7' ], [ 1, ' ', '#e6dfd3' ], [ 1, 'x', '#e6dfd3' ]
    ]);
  });

  it('counts lines and decodes entities', () => {
    assert.deepEqual(runsOf(highlightedRuns(page('a\n<span style="color:#9eb576">&quot;&lt;</span>'))), [
      [ 1, 'a', '#e6dfd3' ], [ 2, '"', '#9eb576' ], [ 2, '<', '#9eb576' ]
    ]);
  });

  it('refuses a style it cannot read', () => {
    assert.throws(() => highlightedRuns(page('<span style="color:#d79bb7;font-weight:bold">if</span>')), /font-weight/);
  });

  it('refuses a span across a newline', () => {
    assert.throws(() => highlightedRuns(page('<span style="color:#d79bb7">/*\n*/</span>')), /newline/);
  });
});

describe('compareEditorSample', () => {
  const tokens = parseTokens(':root {\n  --text: #e6dfd3;\n  --syntax-function: #7fb2d1;\n  --syntax-keyword: #d79bb7;\n}');
  const sample = code('<span class="line"><span class="syn-keyword">int</span> <span class="syn-function">countFiles</span>()</span>');

  it('finds nothing when the colours agree', () => {
    const highlighted = page('<span style="color:#d79bb7">int</span> <span style="color:#7fb2d1">countFiles</span>()');
    assert.deepEqual(compareEditorSample(editorSampleRuns(sample), highlightedRuns(highlighted), tokens), []);
  });

  it('names the runs Kate colours differently', () => {
    const highlighted = page('<span style="color:#d79bb7">int</span> countFiles()');
    assert.deepEqual(compareEditorSample(editorSampleRuns(sample), highlightedRuns(highlighted), tokens), [
      { line: 1, text: 'countFiles', expected: 'syntax-function', found: '#e6dfd3', foundTokens: [ 'text' ] }
    ]);
  });

  it('refuses texts that differ', () => {
    const highlighted = page('<span style="color:#d79bb7">int</span> count()');
    assert.throws(() => compareEditorSample(editorSampleRuns(sample), highlightedRuns(highlighted), tokens), /line 1/);
  });
});
