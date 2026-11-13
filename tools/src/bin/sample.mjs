#!/usr/bin/env node
import { main } from '../lib/cli.mjs';
import { loadTerminalSample } from '../lib/sample.mjs';

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
    }
  }
});
