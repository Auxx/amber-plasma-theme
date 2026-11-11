// Ported from front-burner tools/ai-tools (MIT, same author).
// The reader of the tokens file and the pairs file are Amber's own.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describeColour, isClose, measureContrast, parseColour } from './colour.mjs';

/** The tokens file: the single source of Amber's look (D-30). */
export const TOKENS_FILE = fileURLToPath(new URL('../../../prototype/tokens.css', import.meta.url));

/** The contrast pairs, declared next to the tokens. */
export const PAIRS_FILE = fileURLToPath(new URL('../../../prototype/contrast-pairs.json', import.meta.url));

const NAME = '[a-z0-9]+(?:-[a-z0-9]+)*';

const stripName = name => name.replace(/^--/, '');

/**
 * Parses a token value: `var(--name)`; a part-transparent token
 * `color-mix(in srgb, var(--name) N%, transparent)`; a length in px; or a CSS
 * colour.
 */
export function parseTokenValue(text) {
  const value = text.trim();
  const ref = value.match(new RegExp(`^var\\(\\s*--(${NAME})\\s*\\)$`));
  if (ref) {
    return { ref: ref[1] };
  }
  const mix = value.match(
    new RegExp(`^color-mix\\(\\s*in srgb\\s*,\\s*var\\(\\s*--(${NAME})\\s*\\)\\s+(\\d+(?:\\.\\d+)?)%\\s*,\\s*transparent\\s*\\)$`)
  );
  if (mix) {
    const percent = Number(mix[2]);
    if (!(percent > 0 && percent <= 100)) {
      throw new Error(`The amount of a color-mix must be above 0 % and at most 100 %: ${value}`);
    }
    return { ref: mix[1], alpha: percent / 100 };
  }
  const length = value.match(/^(\d+(?:\.\d+)?)px$/);
  if (length) {
    return { length: { value: Number(length[1]), unit: 'px' } };
  }
  try {
    return { colour: parseColour(value) };
  } catch {
    throw new Error(`Not a colour or a length in px: ${value}`);
  }
}

/** Writes a token value back as the tokens file would: `var(--x)`, a mix, `1px` or a hex. */
export function formatTokenValue(value) {
  if (value.length) {
    return `${value.length.value}${value.length.unit}`;
  }
  if (value.ref) {
    return value.alpha === undefined
      ? `var(--${value.ref})`
      : `color-mix(in srgb, var(--${value.ref}) ${+(value.alpha * 100).toFixed(4)}%, transparent)`;
  }
  const { hex } = describeColour(value.colour);
  const alpha = value.colour.alpha ?? 1;
  return alpha < 1 ? `${hex} / ${+(alpha * 100).toFixed(4)}%` : hex;
}

/** Replaces each comment with the newlines it spans, so line numbers hold. */
const stripComments = source => source.replace(/\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\n]/g, ''));

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

/**
 * Parses the one `:root { --name: value; … }` block of the tokens file.
 * Throws on anything it does not understand, naming the file and line, so
 * that a change of format fails loudly rather than skipping tokens.
 */
export function parseTokens(source, file = 'tokens.css') {
  const text = stripComments(source);
  const open = text.match(/:root\s*\{/);
  if (!open) {
    throw new Error(`${file}: no :root block`);
  }
  const bodyStart = open.index + open[0].length;
  const close = text.indexOf('}', bodyStart);
  if (close < 0) {
    throw new Error(`${file}: the :root block is not closed`);
  }
  const outside = [ [ text.slice(0, open.index), 0 ], [ text.slice(close + 1), close + 1 ] ];
  for (const [ part, offset ] of outside) {
    const found = part.search(/\S/);
    if (found >= 0) {
      throw new Error(`${file}:${lineOf(text, offset + found)}: something outside :root`);
    }
  }
  const tokens = new Map();
  const firstLine = lineOf(text, bodyStart);
  for (const [ index, raw ] of text.slice(bodyStart, close).split('\n').entries()) {
    const line = raw.trim();
    if (line === '') {
      continue;
    }
    const where = `${file}:${firstLine + index}`;
    const declaration = line.match(new RegExp(`^--(${NAME})\\s*:\\s*(.+?)\\s*;$`));
    if (!declaration) {
      throw new Error(`${where}: not a token declaration: ${line}`);
    }
    const [ , name, value ] = declaration;
    if (tokens.has(name)) {
      throw new Error(`${where}: duplicate token --${name}`);
    }
    try {
      tokens.set(name, parseTokenValue(value));
    } catch (error) {
      throw new Error(`${where}: ${error.message}`);
    }
  }
  return tokens;
}

/** Parses overrides written as `token=value` or `--token=value`. */
export function parseOverrides(list = []) {
  return list.map(text => {
    const match = text.match(new RegExp(`^(?:--)?(${NAME})=(.+)$`));
    if (!match) {
      throw Object.assign(new Error(`Not an override (token=value): ${text}`), { code: 'NOT_AN_OVERRIDE' });
    }
    return { name: match[1], value: parseTokenValue(match[2]) };
  });
}

/** Reads the tokens file; `overrides` (from `parseOverrides`) replace or add tokens. */
export function loadTokens({ overrides = [], file = TOKENS_FILE } = {}) {
  const tokens = parseTokens(readFileSync(file, 'utf8'), file);
  for (const { name, value } of overrides) {
    tokens.set(name, value);
  }
  return tokens;
}

/**
 * Resolves a token to a colour, following `var()` and multiplying in the
 * alpha of each `color-mix` on the way. Returns the culori colour
 * and the chain of tokens it went through.
 */
export function resolveToken(tokens, name) {
  const chain = [];
  let alpha = 1;
  let value = { ref: stripName(name) };
  while (value.ref) {
    if (chain.includes(value.ref)) {
      throw new Error(`Token cycle: ${[ ...chain, value.ref ].join(' → ')}`);
    }
    chain.push(value.ref);
    alpha *= value.alpha ?? 1;
    const next = tokens.get(value.ref);
    if (!next) {
      throw new Error(`Unknown token: ${value.ref}${chain.length > 1 ? ` (via ${chain.join(' → ')})` : ''}`);
    }
    value = next;
  }
  if (value.length) {
    throw new Error(`Not a colour: ${chain.at(-1)} is a length (${formatTokenValue(value)})`);
  }
  if (alpha === 1) {
    return { colour: value.colour, chain };
  }
  return { colour: { ...value.colour, alpha: (value.colour.alpha ?? 1) * alpha }, chain };
}

const isName = value => typeof value === 'string' && new RegExp(`^${NAME}$`).test(value);
const isText = value => typeof value === 'string' && value.trim() !== '';

/**
 * Parses the pairs file: a JSON array of `{ foreground, on, minimum, why }`.
 * Each item of `on` is a token name, or an array of names that are layers
 * from the bottom up, and becomes one pair.
 */
export function parsePairs(source, file = 'contrast-pairs.json') {
  const entries = JSON.parse(source);
  if (!Array.isArray(entries)) {
    throw new Error(`${file}: not an array of pairs`);
  }
  return entries.flatMap((entry, index) => {
    const fail = message => {
      throw new Error(`${file}: entry ${index + 1}: ${message}`);
    };
    const { foreground, on, minimum, why } = entry ?? {};
    if (!isName(foreground)) {
      fail('"foreground" must be a token name');
    }
    if (!isText(why)) {
      fail('"why" must say why the pair exists');
    }
    if (typeof minimum !== 'number' || !(minimum >= 1 && minimum <= 21)) {
      fail('"minimum" must be a number from 1 to 21');
    }
    if (!Array.isArray(on) || on.length === 0) {
      fail('"on" must be a non-empty array of backgrounds');
    }
    return on.map(item => {
      const background = Array.isArray(item) ? item : [ item ];
      if (background.length === 0 || !background.every(isName)) {
        fail(`"on" item is not a token name or a list of them: ${JSON.stringify(item)}`);
      }
      return { foreground, background, minimum, why };
    });
  });
}

/** Reads the pairs file. */
export function loadPairs(file = PAIRS_FILE) {
  return parsePairs(readFileSync(file, 'utf8'), file);
}

/**
 * Measures every pair. Each result has the pair, its `ratio`, a `status` of
 * `pass`, `fail` or `missing`, `close` when it passes by less than
 * `CLOSE_MARGIN`, and an `error` when a token is missing or the background is
 * not opaque.
 */
export function checkPairs(tokens, pairs) {
  return pairs.map(pair => {
    const result = { pair };
    try {
      const colour = name => resolveToken(tokens, name).colour;
      const measured = measureContrast(colour(pair.foreground), pair.background.map(colour));
      if (!measured.opaque) {
        throw new Error(`the background of ${describePair(pair)} is not opaque`);
      }
      result.ratio = measured.ratio;
      result.status = measured.ratio >= pair.minimum ? 'pass' : 'fail';
      result.close = isClose(measured.ratio, pair.minimum);
    } catch (error) {
      result.status = 'missing';
      result.error = error.message;
    }
    return result;
  });
}

/** `text-dim on tone-2 + tone-3`. */
export function describePair(pair) {
  return `${pair.foreground} on ${pair.background.join(' + ')}`;
}
