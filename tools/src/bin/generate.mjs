#!/usr/bin/env node
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../lib/cli.mjs';
import { PARTS, differs, writePart } from '../lib/generate.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));

/** A command that prints one part, or writes it with --write. */
function partCommand(name, summary) {
  const { file, generate } = PARTS[name];
  const path = relative(root, file);
  return {
    usage: '[--write] [--json]',
    summary,
    help: `Prints ${path} as it would be generated now. Nothing is written
without --write; with it, the file is written only when it differs, and the
output says "written" or "unchanged". --json prints { part, file, changed,
written, content }.`,
    options: { write: { type: 'boolean' }, json: { type: 'boolean' } },
    run(values) {
      const content = generate();
      const { changed } = values.write ? writePart(file, content) : { changed: differs(file, content) };
      const written = Boolean(values.write) && changed;
      if (values.json) {
        console.log(JSON.stringify({ part: name, file: path, changed, written, content }, null, 2));
      } else if (values.write) {
        console.log(`${path}: ${written ? 'written' : 'unchanged'}`);
      } else {
        process.stdout.write(content);
      }
      return 0;
    }
  };
}

main({
  name: 'generate',
  summary: "Generates Amber's parts from the tokens; writes only with --write.",
  commands: {
    'colour-scheme': partCommand('colour-scheme', 'The colour scheme, parts/colour-scheme/Amber.colors, from the tokens and roles.json'),
    'union-style-tokens': partCommand('union-style-tokens', "The Union style's tokens, parts/union-style/amber/contents/css/tokens.css, from the tokens"),
    'terminal-colours': partCommand('terminal-colours', 'The terminal colours, parts/terminal-colours/Amber.colorscheme, from the tokens and keys.json')
  }
});
