import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadStyles } from './editor-theme.mjs';
import { PARTS } from './generate.mjs';
import { SAMPLES_FILE, compareEditorSample, editorSampleRuns, highlightedRuns, loadEditorSample } from './sample.mjs';
import { loadTokens } from './tokens.mjs';

/** Why the highlighter specs are skipped, or null when ksyntaxhighlighter6 runs. */
const HIGHLIGHTER = spawnSync('ksyntaxhighlighter6', [ '--version' ], { encoding: 'utf8' }).status === 0
  ? null
  : 'ksyntaxhighlighter6 is not installed';

const SAMPLES_CSS = fileURLToPath(new URL('../../../prototype/samples.css', import.meta.url));

/** The token the rules `selector { … }` of samples.css read for `property`, as `property: var(--token)`. */
function sampleToken(css, selector, property) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rules = [ ...css.matchAll(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')) ];
  assert.ok(rules.length, `samples.css has no rule ${selector}`);
  const value = rules
    .map(rule => rule[1].match(new RegExp(`(?:^|[\\s;])${property}\\s*:\\s*var\\(--([a-z0-9-]+)\\)`)))
    .find(Boolean);
  assert.ok(value, `${selector} in samples.css reads no token for ${property}`);
  return value[1];
}

describe('Amber.theme', () => {
  const { file, generate } = PARTS['editor-theme'];

  it('is up to date', () => {
    assert.equal(readFileSync(file, 'utf8'), generate(), 'run: node tools/src/bin/generate.mjs editor-theme --write');
  });

  it("uses the sample's tokens", () => {
    const css = readFileSync(SAMPLES_CSS, 'utf8');
    const colours = loadStyles()['editor-colors'];
    const expected = {
      BackgroundColor: sampleToken(css, '.code', 'background'),
      IconBorder: sampleToken(css, '.gutter', 'background'),
      CurrentLine: sampleToken(css, '.current-line', 'background'),
      TextSelection: sampleToken(css, '.text-selection', 'background'),
      SearchHighlight: sampleToken(css, '.search-highlight', 'background'),
      LineNumbers: sampleToken(css, '.gutter', 'color'),
      CurrentLineNumber: sampleToken(css, '.current-line-number', 'color')
    };
    assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key => [ key, colours[key] ])), expected);
    assert.equal(loadStyles()['text-styles'].Normal, sampleToken(css, '.code', 'color'));
  });
});

describe('the editor sample in Kate', () => {
  it("matches Kate's highlighting of the sample", t => {
    if (HIGHLIGHTER) {
      return t.skip(HIGHLIGHTER);
    }
    // The theme is found through XDG_DATA_DIRS, which must be absolute (P4.2).
    const folder = mkdtempSync(join(tmpdir(), 'amber-editor-'));
    try {
      const themes = join(folder, 'data', 'org.kde.syntax-highlighting', 'themes');
      mkdirSync(themes, { recursive: true });
      symlinkSync(PARTS['editor-theme'].file, join(themes, 'Amber.theme'));
      writeFileSync(join(folder, 'counter.cpp'), loadEditorSample());
      const { status, stdout, stderr } = spawnSync('ksyntaxhighlighter6', [ '-t', 'Amber', join(folder, 'counter.cpp') ], {
        encoding: 'utf8',
        env: { ...process.env, XDG_DATA_DIRS: `${join(folder, 'data')}:/usr/share` }
      });
      assert.equal(status, 0, stderr);
      assert.match(stdout, /Theme \(Amber\)/, 'ksyntaxhighlighter6 did not find the Amber theme');
      const runs = compareEditorSample(editorSampleRuns(readFileSync(SAMPLES_FILE, 'utf8')), highlightedRuns(stdout), loadTokens());
      assert.deepEqual(runs, []);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
