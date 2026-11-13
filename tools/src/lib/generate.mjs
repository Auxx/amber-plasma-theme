import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatColourScheme, loadRoles } from './colour-scheme.mjs';
import { formatEditorTheme, loadStyles } from './editor-theme.mjs';
import { formatTerminalColours, loadKeys } from './terminal-colours.mjs';
import { loadTokens } from './tokens.mjs';
import { formatUnionTokens } from './union-tokens.mjs';

/**
 * The parts Amber generates from its tokens, each with the file it is written
 * to and a function that returns that file's text, from the tokens it is
 * given (the tokens file by default). A generated part is committed beside
 * the files it comes from (D-92).
 */
export const PARTS = {
  'colour-scheme': {
    file: fileURLToPath(new URL('../../../parts/colour-scheme/Amber.colors', import.meta.url)),
    generate: (tokens = loadTokens()) => formatColourScheme(loadRoles(), tokens)
  },
  'union-style-tokens': {
    file: fileURLToPath(new URL('../../../parts/union-style/amber/contents/css/tokens.css', import.meta.url)),
    generate: (tokens = loadTokens()) => formatUnionTokens(tokens)
  },
  'terminal-colours': {
    file: fileURLToPath(new URL('../../../parts/terminal-colours/Amber.colorscheme', import.meta.url)),
    generate: (tokens = loadTokens()) => formatTerminalColours(loadKeys(), tokens)
  },
  'editor-theme': {
    file: fileURLToPath(new URL('../../../parts/editor-theme/Amber.theme', import.meta.url)),
    generate: (tokens = loadTokens()) => formatEditorTheme(loadStyles(), tokens)
  }
};

/** Whether `file` is absent or holds something other than `text`. */
export const differs = (file, text) => !existsSync(file) || readFileSync(file, 'utf8') !== text;

/** Writes `text` to `file` only when it differs, so that an equal file keeps its time. */
export function writePart(file, text) {
  if (!differs(file, text)) {
    return { changed: false };
  }
  writeFileSync(file, text);
  return { changed: true };
}
