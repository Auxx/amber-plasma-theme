#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { UsageError, main, print } from '../lib/cli.mjs';
import { SAMPLES_FILE, compareEditorSample, editorSampleRuns, highlightedRuns, loadEditorSample, loadTerminalSample } from '../lib/sample.mjs';
import { loadTokens } from '../lib/tokens.mjs';

main({
  name: 'sample',
  summary: "Prints the prototype's samples for a real terminal or editor.",
  commands: {
    terminal: {
      usage: '[--file <html>]',
      summary: "The terminal sample of prototype/samples.html, with ANSI escape sequences",
      help: `Prints the text of the first <pre class="terminal"> of the page, each
<span class="ansi-…"> or "on-…" turned into its SGR sequence, so that a
terminal draws it in its own terminal colours. --file reads another page.
A class, tag or entity it does not know is an error (exit 1).`,
      options: { file: { type: 'string' } },
      run(values) {
        const text = loadTerminalSample(values.file);
        process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
        return 0;
      }
    },
    editor: {
      usage: '[--file <html>]',
      summary: "The editor sample of prototype/samples.html, as plain text",
      help: `Prints the code of the Kate sample's <div class="code">, one line for each
<span class="line">, entities decoded and every span left out, so that
ksyntaxhighlighter6 or Kate can colour it. --file reads another page. A class
or tag it does not know is an error (exit 1).`,
      options: { file: { type: 'string' } },
      run(values) {
        process.stdout.write(loadEditorSample(values.file));
        return 0;
      }
    },
    'compare-editor': {
      usage: '<highlighted.html> [--file <html>] [--json]',
      summary: "Compares ksyntaxhighlighter6's colours of the editor sample with the prototype's tokens",
      help: `Reads the HTML that ksyntaxhighlighter6 wrote for the text of sample editor,
and prints each run whose colour is not the hex of the token the prototype
gives it, whitespace left out: its line, its text, the token expected and the
colour found, named as tokens. Exits 0 when every run agrees, 1 when any
differs, or when the two texts differ or the page cannot be read. --file reads
another samples page.`,
      options: { file: { type: 'string' }, json: { type: 'boolean' } },
      run(values, positionals) {
        if (positionals.length !== 1) {
          throw new UsageError('Give one highlighted HTML file.');
        }
        const sample = editorSampleRuns(readFileSync(values.file ?? SAMPLES_FILE, 'utf8'));
        const runs = compareEditorSample(sample, highlightedRuns(readFileSync(positionals[0], 'utf8')), loadTokens());
        print(values.json, runs, () =>
          runs.length
            ? runs.map(({ line, text, expected, found, foundTokens }) =>
              `line ${line}  ${text}  expected ${expected}, found ${found}${foundTokens.length ? ` (${foundTokens.join(', ')})` : ''}`).join('\n')
            : 'Every run has its token.');
        return runs.length ? 1 : 0;
      }
    }
  }
});
