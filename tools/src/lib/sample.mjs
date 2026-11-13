import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { srgb8 } from './colour.mjs';
import { resolveToken } from './tokens.mjs';

/** The prototype's samples page, which holds the terminal sample (P1.6). */
export const SAMPLES_FILE = fileURLToPath(new URL('../../../prototype/samples.html', import.meta.url));

/** The eight ANSI colours, in the order of their numbers. */
const NAMES = [ 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white' ];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Decodes the entities of HTML text. Throws on a named entity it does not know. */
export function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name.startsWith('#x') || name.startsWith('#X')) {
      return String.fromCodePoint(parseInt(name.slice(2), 16));
    }
    if (name.startsWith('#')) {
      return String.fromCodePoint(Number(name.slice(1)));
    }
    if (!Object.hasOwn(ENTITIES, name)) {
      throw new Error(`The sample has an entity the printer does not know: ${entity}`);
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

/** The syntax kinds of the editor sample, each read from a `syn-<kind>` class as `syntax-<kind>`. */
const SYNTAX = [ 'keyword', 'function', 'type', 'string', 'number', 'preprocessor', 'comment' ];

/** Classes of the editor sample that change no text colour. */
const PLAIN = [ 'current-line', 'text-selection', 'search-highlight' ];

/** The lines of the editor sample: each an array of `{ char, token }`. */
function editorSampleLines(html) {
  const kate = html.search(/class="[^"]*\bkate\b[^"]*"/);
  const found = kate < 0 ? null : html.slice(kate).match(/<div class="code">([\s\S]*?)<\/div>/);
  if (!found) {
    throw new Error('The page has no <div class="code"> in a Kate sample');
  }
  const lines = [];
  const stack = [];
  for (const part of found[1].split(/(<[^>]*>)/)) {
    if (part === '') {
      continue;
    }
    if (!part.startsWith('<')) {
      if (stack.length === 0) {
        if (part.trim() !== '') {
          throw new Error(`The editor sample has text outside a line: ${part.trim()}`);
        }
        continue;
      }
      const kind = stack.findLast(token => token !== null);
      for (const char of decode(part)) {
        lines.at(-1).push({ char, token: kind ?? 'text' });
      }
      continue;
    }
    const span = part.match(/^<span class="([^"]*)">$/);
    if (span) {
      const classes = span[1].split(/\s+/).filter(Boolean);
      if (stack.length === 0) {
        if (!classes.includes('line')) {
          throw new Error(`The editor sample has a span outside a line: ${part}`);
        }
        lines.push([]);
      }
      let token = null;
      for (const name of classes) {
        const kind = name.match(/^syn-(.+)$/)?.[1];
        if (kind !== undefined && SYNTAX.includes(kind)) {
          token = `syntax-${kind}`;
        } else if (!(name === 'line' && stack.length === 0) && !PLAIN.includes(name)) {
          throw new Error(`The editor sample has a class the printer does not know: ${name}`);
        }
      }
      stack.push(token);
    } else if (part === '</span>') {
      stack.pop();
    } else {
      throw new Error(`The editor sample has a tag the printer does not know: ${part}`);
    }
  }
  return lines;
}

/**
 * Every character of the editor sample of `html` (the `.code` block of its
 * Kate sample), with its line number from 1 and its token: the innermost
 * `syn-<kind>` class's `syntax-<kind>`, or `text`. Throws on a class or tag
 * it does not know.
 */
export function editorSampleRuns(html) {
  return editorSampleLines(html).flatMap((chars, index) => chars.map(({ char, token }) => ({ line: index + 1, char, token })));
}

/** The editor sample as plain text, every line ended by a newline. */
export function editorSampleText(html) {
  return editorSampleLines(html).map(chars => `${chars.map(({ char }) => char).join('')}\n`).join('');
}

/** Reads the samples page and returns its editor sample as plain text. */
export function loadEditorSample(file = SAMPLES_FILE) {
  return editorSampleText(readFileSync(file, 'utf8'));
}

/**
 * Every character of the HTML that ksyntaxhighlighter6 writes, with its line
 * number from 1 and its colour: the span's, or the body's outside a span.
 * Throws on a style other than one colour, a nested span, a span across a
 * newline, or another tag.
 */
export function highlightedRuns(html) {
  const body = html.match(/<body style="([^"]*)">/)?.[1].match(/(?:^|;)color:(#[0-9a-f]{6})(?:;|$)/i)?.[1];
  const found = html.match(/<pre>([\s\S]*?)<\/pre>/);
  if (!body || !found) {
    throw new Error('The page is not what ksyntaxhighlighter6 writes: no body colour or no <pre>');
  }
  const runs = [];
  let line = 1;
  let colour = null;
  // The newline just after <pre> is not part of the text.
  for (const part of found[1].replace(/^\n/, '').split(/(<[^>]*>)/)) {
    if (part === '') {
      continue;
    }
    if (!part.startsWith('<')) {
      for (const char of decode(part)) {
        if (char === '\n') {
          if (colour !== null) {
            throw new Error(`The highlighted page has a span across a newline, at line ${line}`);
          }
          line += 1;
        } else {
          runs.push({ line, char, colour: colour ?? body.toLowerCase() });
        }
      }
      continue;
    }
    const span = part.match(/^<span style="([^"]*)">$/);
    if (span) {
      if (colour !== null) {
        throw new Error(`The highlighted page has a nested span, at line ${line}`);
      }
      const value = span[1].match(/^color:(#[0-9a-f]{6})$/i);
      if (!value) {
        throw new Error(`The highlighted page has a style the comparison cannot read, at line ${line}: ${span[1]}`);
      }
      colour = value[1].toLowerCase();
    } else if (part === '</span>') {
      colour = null;
    } else {
      throw new Error(`The highlighted page has a tag the comparison does not know, at line ${line}: ${part}`);
    }
  }
  return runs;
}

/** The hex of every opaque colour token, each with every token of that hex. */
function tokensByHex(tokens) {
  const byHex = new Map();
  for (const name of tokens.keys()) {
    let rgb;
    try {
      rgb = srgb8(resolveToken(tokens, name).colour);
    } catch {
      continue; // a length, not a colour
    }
    if (rgb.alpha === 1) {
      const hex = `#${[ rgb.r, rgb.g, rgb.b ].map(n => n.toString(16).padStart(2, '0')).join('')}`;
      byHex.set(hex, [ ...(byHex.get(hex) ?? []), name ]);
    }
  }
  return byHex;
}

/**
 * The runs whose highlighted colour is not the hex of the sample's token,
 * whitespace left out. Neighbouring characters of the sample that differ in
 * the same way are one run. Throws when the two texts differ.
 */
export function compareEditorSample(sample, highlighted, tokens) {
  const visible = runs => runs.map((run, index) => ({ ...run, index })).filter(({ char }) => char.trim() !== '');
  const want = visible(sample);
  const got = visible(highlighted);
  const at = want.findIndex((run, index) => got[index]?.char !== run.char);
  if (at >= 0 || got.length !== want.length) {
    const line = at >= 0 ? want[at].line : (want.at(-1)?.line ?? 1);
    throw new Error(`The highlighted text differs from the sample at line ${line}`);
  }
  const byHex = tokensByHex(tokens);
  const hexOf = name => [ ...byHex ].find(([ , names ]) => names.includes(name))?.[0];
  const differences = [];
  want.forEach((run, index) => {
    const found = got[index].colour;
    if (hexOf(run.token) === found) {
      return;
    }
    const last = differences.at(-1);
    if (last && last.line === run.line && last.expected === run.token && last.found === found && last.end === run.index - 1) {
      last.text += run.char;
      last.end = run.index;
    } else {
      differences.push({ line: run.line, text: run.char, expected: run.token, found, foundTokens: byHex.get(found) ?? [], end: run.index });
    }
  });
  return differences.map(({ end, ...difference }) => difference);
}
