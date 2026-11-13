import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The prototype's samples page, which holds the terminal sample (P1.6). */
export const SAMPLES_FILE = fileURLToPath(new URL('../../../prototype/samples.html', import.meta.url));

/** The eight ANSI colours, in the order of their numbers. */
const NAMES = [ 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white' ];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name.startsWith('#x') || name.startsWith('#X')) {
      return String.fromCodePoint(parseInt(name.slice(2), 16));
    }
    if (name.startsWith('#')) {
      return String.fromCodePoint(Number(name.slice(1)));
    }
    if (!Object.hasOwn(ENTITIES, name)) {
      throw new Error(`The terminal sample has an entity the printer does not know: ${entity}`);
    }
    return ENTITIES[name];
  });
}

/** The SGR code of one class of the sample: `ansi-<n>`, `ansi-bright-<n>` or `on-<n>`. */
function codeOf(name) {
  const match = name.match(/^(ansi-bright-|ansi-|on-)([a-z]+)$/);
  const index = match ? NAMES.indexOf(match[2]) : -1;
  if (index < 0 || (match[1] === 'on-' && index === NAMES.indexOf('white'))) {
    throw new Error(`The terminal sample has a class the printer does not know: ${name}`);
  }
  return { 'ansi-': 30, 'ansi-bright-': 90, 'on-': 40 }[match[1]] + index;
}

/**
 * The text of the first `<pre class="terminal">` of `html`, with each
 * `<span class="…">` turned into its SGR sequence and closed with a reset, so
 * that a terminal shows the sample in its own terminal colours. Throws on a
 * class, tag or entity it does not know, and on a nested span.
 */
export function terminalSampleToAnsi(html) {
  const found = html.match(/<pre class="terminal">([\s\S]*?)<\/pre>/);
  if (!found) {
    throw new Error('The page has no <pre class="terminal">');
  }
  let out = '';
  let open = false;
  for (const part of found[1].split(/(<[^>]*>)/)) {
    if (!part.startsWith('<')) {
      out += decode(part);
      continue;
    }
    const span = part.match(/^<span class="([^"]*)">$/);
    if (span) {
      if (open) {
        throw new Error('The terminal sample has a nested span');
      }
      const classes = span[1].split(/\s+/).filter(Boolean);
      out += `\x1b[${classes.map(codeOf).join(';')}m`;
      open = true;
    } else if (part === '</span>') {
      out += '\x1b[0m';
      open = false;
    } else {
      throw new Error(`The terminal sample has a tag the printer does not know: ${part}`);
    }
  }
  return out;
}

/** Reads the samples page and returns its terminal sample with ANSI escapes. */
export function loadTerminalSample(file = SAMPLES_FILE) {
  return terminalSampleToAnsi(readFileSync(file, 'utf8'));
}
