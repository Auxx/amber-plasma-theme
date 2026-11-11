// Opens prototype pages in the installed Google Chrome through playwright-core
// (D-45, D-46). The parts here that need no browser are tested without one.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { UsageError } from './cli.mjs';
import { describeColour, parseColour } from './colour.mjs';
import { resolveToken } from './tokens.mjs';

/** The repository's root folder. */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');

/** True when `path` is `folder` or inside it. */
const isInside = (folder, path) => {
  const rel = relative(folder, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

/** The `file://` URL of a page, given relative to `root` or absolute. */
export function pageUrl(path, root = REPO_ROOT) {
  const file = resolve(root, path);
  if (!existsSync(file)) {
    throw new Error(`No such page: ${path}`);
  }
  return pathToFileURL(file).href;
}

/**
 * Where a screenshot is written: `tmp/<name>.png` in the repository by
 * default (gitignored). Tool rule 6: never under the owner's home folder
 * outside the repository.
 */
export function outPath(path, { name, root = REPO_ROOT, home = homedir() }) {
  if (path === undefined) {
    return join(root, 'tmp', `${name}.png`);
  }
  if (!path.endsWith('.png')) {
    throw new UsageError(`Not a .png file: ${path}`);
  }
  const file = resolve(root, path);
  if (!isInside(root, file) && isInside(home, file)) {
    throw new UsageError(`Will not write under the home folder outside the repository: ${path}`);
  }
  return file;
}

/** Reads the `rgb(…)` or `rgba(…)` that `getComputedStyle` gives. */
export function parseCssColour(text) {
  const match = text.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/);
  if (!match) {
    throw new Error(`Not a computed colour: ${text}`);
  }
  const [ , r, g, b, alpha = '1' ] = match;
  return { r: Number(r), g: Number(g), b: Number(b), alpha: Number(alpha) };
}

const hexOf = ({ r, g, b }) => describeColour(parseColour(`rgb(${r} ${g} ${b})`)).hex;

/** The hex of every opaque colour token, mapped to its names in file order. */
export function tokenNames(tokens) {
  const names = new Map();
  for (const [ name, value ] of tokens) {
    if (value.length) {
      continue;
    }
    const { colour } = resolveToken(tokens, name);
    if ((colour.alpha ?? 1) < 1) {
      continue;
    }
    const hex = describeColour(colour).hex;
    names.set(hex, [ ...(names.get(hex) ?? []), name ]);
  }
  return names;
}

/** A computed colour, named as tokens where one matches: `#1c1a18 (tone-1)`. */
export function nameColour(text, names) {
  const colour = parseCssColour(text);
  if (colour.alpha === 0) {
    return 'transparent';
  }
  if (colour.alpha < 1) {
    return `rgb(${colour.r} ${colour.g} ${colour.b} / ${+(colour.alpha * 100).toFixed(2)}%)`;
  }
  const hex = hexOf(colour);
  const tokens = names.get(hex);
  return tokens ? `${hex} (${tokens.join(', ')})` : hex;
}
