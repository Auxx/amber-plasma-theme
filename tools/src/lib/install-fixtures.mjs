import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { after } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Shared by the specs of the install and uninstall scripts (P6.1, P6.2):
 * throwaway homes, snapshots of a tree, running a script, and reading a
 * KConfig file.
 */

export const REPO = fileURLToPath(new URL('../../..', import.meta.url));
export const PARTS = join(REPO, 'parts');
const roots = [];
after(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

/** A temporary folder holding `home/` (or the name given). */
export function makeRoot(homeName = 'home') {
  const root = mkdtempSync(join(tmpdir(), 'amber-install-'));
  roots.push(root);
  const home = join(root, homeName);
  mkdirSync(home);
  return { root, home };
}

/** Every entry under `dir`, sorted, as [relative path, sha256 of a file or "dir"]. */
export function snapshot(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) {
        out.push([relative(dir, p), 'dir']);
        walk(p);
      } else {
        out.push([relative(dir, p), createHash('sha256').update(readFileSync(p)).digest('hex')]);
      }
    }
  };
  walk(dir);
  return out;
}

/** Runs a script with an environment of PATH, HOME and `env` alone. */
export function run(script, home, { env = {}, cwd = dirname(home), args = [] } = {}) {
  const r = spawnSync('bash', [join(REPO, 'scripts', `${script}.sh`), ...args], {
    cwd,
    env: { PATH: process.env.PATH, HOME: home, ...env },
    encoding: 'utf8',
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

export function put(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

/**
 * A KConfig file as a Map of "group\tkey" to value, as KConfig reads it:
 * `[a][b]` is the group `a][b`; comments and blank lines are skipped. A
 * missing file is an empty Map.
 */
export function ini(file) {
  const out = new Map();
  if (!existsSync(file)) return out;
  let group = '';
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line === '' || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      group = line.slice(1, -1);
      continue;
    }
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    out.set(`${group}\t${line.slice(0, eq)}`, line.slice(eq + 1));
  }
  return out;
}
