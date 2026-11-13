#!/usr/bin/env node
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UsageError, main } from '../lib/cli.mjs';
import { PARTS, differs, writePart } from '../lib/generate.mjs';
import { loadTokens, parseOverrides } from '../lib/tokens.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));

/** The files of a part as [{ file (absolute), content }]: one for a file part, several for a folder part. */
function filesOf(part, tokens) {
  if (part.file) {
    return [ { file: part.file, content: part.generate(tokens) } ];
  }
  return Object.entries(part.generate(tokens)).map(([ name, content ]) => ({ file: join(part.folder, name), content }));
}

/** A command that prints one part, or writes it with --write. */
function partCommand(name, summary) {
  const part = PARTS[name];
  const path = relative(root, part.file ?? part.folder);
  return {
    usage: '[--write | --set token=value...] [--json]',
    summary,
    help: `Prints ${path} as it would be generated now${part.folder ? ', each file under a heading' : ''}. Nothing is written
without --write; with it, the file is written only when it differs, and the
output says "written" or "unchanged". --set token=value, given once for each
token, prints the part with those trial values, as tokens try does; the token
must exist, and --set cannot be combined with --write. --json prints { part, file, changed, written,
content }${part.folder ? '; for a part of several files, { part, files: [{ file, changed, written, content }] }' : ''}.`,
    options: { write: { type: 'boolean' }, set: { type: 'string', multiple: true }, json: { type: 'boolean' } },
    run(values) {
      if (values.set && values.write) {
        throw new UsageError('--set prints a trial and cannot be combined with --write');
      }
      let overrides;
      try {
        overrides = parseOverrides(values.set ?? []);
      } catch (error) {
        throw new UsageError(error.message);
      }
      const known = loadTokens();
      const unknown = overrides.filter(({ name }) => !known.has(name)).map(({ name }) => name);
      if (unknown.length > 0) {
        throw new UsageError(`--set names a token that does not exist: ${unknown.join(', ')}`);
      }
      const files = filesOf(part, loadTokens({ overrides })).map(({ file, content }) => {
        const { changed } = values.write ? writePart(file, content) : { changed: differs(file, content) };
        return { file: relative(root, file), changed, written: Boolean(values.write) && changed, content };
      });
      if (values.json) {
        const report = part.file ? { part: name, ...files[0] } : { part: name, files };
        console.log(JSON.stringify(report, null, 2));
      } else if (values.write) {
        for (const { file, written } of files) {
          console.log(`${file}: ${written ? 'written' : 'unchanged'}`);
        }
      } else if (part.file) {
        process.stdout.write(files[0].content);
      } else {
        process.stdout.write(files.map(({ file, content }) => `==> ${file} <==\n${content}`).join('\n'));
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
    'terminal-colours': partCommand('terminal-colours', 'The terminal colours, parts/terminal-colours/Amber.colorscheme, from the tokens and keys.json'),
    'editor-theme': partCommand('editor-theme', 'The editor theme, parts/editor-theme/Amber.theme, from the tokens and styles.json'),
    decoration: partCommand('decoration', "The window decoration's decoration.svg and amberrc, in parts/decoration/amber/, from the tokens")
  }
});
