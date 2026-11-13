import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The install and uninstall scripts (roadmap P6.1). Each case runs them in a
 * throwaway home and compares the whole tree before and after: uninstalling
 * must leave the home as it was, and neither script may write outside its
 * data home, its cache home or its install record.
 */

const REPO = fileURLToPath(new URL('../../..', import.meta.url));
const PARTS = join(REPO, 'parts');
const roots = [];
after(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

/** A temporary folder holding `home/` (or the name given). */
function makeRoot(homeName = 'home') {
  const root = mkdtempSync(join(tmpdir(), 'amber-install-'));
  roots.push(root);
  const home = join(root, homeName);
  mkdirSync(home);
  return { root, home };
}

/** Every entry under `dir`, sorted, as [relative path, sha256 of a file or "dir"]. */
function snapshot(dir) {
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
function run(script, home, { env = {}, cwd = dirname(home), args = [] } = {}) {
  const r = spawnSync('bash', [join(REPO, 'scripts', `${script}.sh`), ...args], {
    cwd,
    env: { PATH: process.env.PATH, HOME: home, ...env },
    encoding: 'utf8',
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function put(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

/** Every file of the parts, as [source, target relative to the data home]. */
function targets() {
  const list = [
    ['colour-scheme/Amber.colors', 'color-schemes/Amber.colors'],
    ['terminal-colours/Amber.colorscheme', 'konsole/Amber.colorscheme'],
    ['editor-theme/Amber.theme', 'org.kde.syntax-highlighting/themes/Amber.theme'],
  ];
  for (const f of readdirSync(join(PARTS, 'decoration/amber'))) {
    list.push([`decoration/amber/${f}`, `aurorae/themes/amber/${f}`]);
  }
  const style = join(PARTS, 'union-style/amber');
  for (const [rel, kind] of snapshot(style)) {
    if (kind !== 'dir') list.push([`union-style/amber/${rel}`, `union/styles/amber/${rel}`]);
  }
  return list;
}

/** The name Union gives the cache file of a style folder (P6.1, Task 1). */
const cacheName = (folder) => createHash('sha256').update(folder).digest('base64url');

describe('scripts/install.sh and scripts/uninstall.sh', () => {
  it('installs every part', () => {
    const { home } = makeRoot();
    const r = run('install', home);
    assert.equal(r.code, 0, r.stderr);
    const data = join(home, '.local/share');
    for (const [from, to] of targets()) {
      assert.deepEqual(readFileSync(join(data, to)), readFileSync(join(PARTS, from)), to);
    }
    const record = readFileSync(join(data, 'amber/installed'), 'utf8').trim().split('\n');
    for (const [, to] of targets()) assert.ok(record.includes(`file ${join(data, to)}`), to);
    for (const d of ['.local', '.local/share', '.local/share/union', '.local/share/union/styles',
      '.local/share/union/styles/amber', '.local/share/aurorae/themes/amber', '.local/share/amber']) {
      assert.ok(record.includes(`dir ${join(home, d)}`), d);
    }
    assert.ok(record.includes(`absent ${join(home, '.cache/union')}`));
    assert.match(r.stdout, /colour scheme → .*color-schemes\/Amber\.colors/);
  });

  it('round trip on an empty home', () => {
    const { root, home } = makeRoot();
    const before = snapshot(root);
    assert.equal(run('install', home).code, 0);
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(snapshot(root), before);
  });

  it('keeps folders it did not create', () => {
    const { root, home } = makeRoot();
    mkdirSync(join(home, '.local/share/aurorae/themes'), { recursive: true });
    mkdirSync(join(home, '.local/share/color-schemes'), { recursive: true });
    put(join(home, '.local/share/konsole/Profile 1.profile'), '[General]\nName=Profile 1\n');
    put(join(home, '.cache/union/57vfQhk0ynARccxkOyd3ezEPSlQm1lTmmNnG_Ng15v0'), 'breeze');
    const before = snapshot(root);
    assert.equal(run('install', home).code, 0);
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(snapshot(root), before);
  });

  it("removes Amber's cache file only", () => {
    const { root, home } = makeRoot();
    const before = snapshot(root);
    assert.equal(run('install', home).code, 0);
    const ours = cacheName(join(home, '.local/share/union/styles/amber'));
    put(join(home, '.cache/union', ours), 'amber');
    put(join(home, '.cache/union/foreign'), 'breeze');
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(readdirSync(join(home, '.cache/union')), ['foreign']);
    rmSync(join(home, '.cache'), { recursive: true });
    assert.deepEqual(snapshot(root), before);
  });

  it("removes Amber's cache folder when Union made it for Amber alone", () => {
    const { root, home } = makeRoot();
    mkdirSync(join(home, '.cache'));
    const before = snapshot(root);
    assert.equal(run('install', home).code, 0);
    put(join(home, '.cache/union', cacheName(join(home, '.local/share/union/styles/amber'))), 'amber');
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(snapshot(root), before);
  });

  it('installs twice like once', () => {
    const once = makeRoot();
    assert.equal(run('install', once.home).code, 0);
    const { root, home } = makeRoot();
    const before = snapshot(root);
    assert.equal(run('install', home).code, 0);
    const r = run('install', home);
    assert.equal(r.code, 0, r.stderr);
    const RECORD = '.local/share/amber/installed';
    const withoutRecord = (h) => snapshot(h).filter(([p]) => p !== RECORD);
    assert.deepEqual(withoutRecord(home), withoutRecord(once.home));
    const recordOf = (h) => readFileSync(join(h, '.local/share/amber/installed'), 'utf8').replaceAll(h, '~');
    assert.equal(recordOf(home), recordOf(once.home));
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(snapshot(root), before);
  });

  it('refuses a file it did not write', () => {
    const { root, home } = makeRoot();
    const mine = join(home, '.local/share/color-schemes/Amber.colors');
    put(mine, 'mine');
    const before = snapshot(root);
    const r = run('install', home);
    assert.equal(r.code, 1);
    assert.ok(r.stderr.includes(mine), r.stderr);
    assert.deepEqual(snapshot(root), before);
  });

  it('leaves a foreign file and says so', () => {
    const { home } = makeRoot();
    assert.equal(run('install', home).code, 0);
    const css = join(home, '.local/share/union/styles/amber/contents/css');
    put(join(css, 'extra.css'), 'button {}');
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(readdirSync(css), ['extra.css']);
    assert.ok(r.stdout.includes(join(css, 'extra.css')), r.stdout);
    assert.equal(existsSync(join(home, '.local/share/color-schemes')), false);
    assert.equal(existsSync(join(home, '.local/share/amber')), false);
  });

  it('reports a selection and changes no setting', () => {
    const { home } = makeRoot();
    put(join(home, '.config/kdeglobals'), '[General]\nColorScheme=Amber\n');
    put(join(home, '.config/kwinrc'), '[org.kde.kdecoration2]\ntheme=__aurorae__svg__amber\n');
    const config = snapshot(join(home, '.config'));
    assert.equal(run('install', home).code, 0);
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /ColorScheme=Amber in .*kdeglobals/);
    assert.match(r.stdout, /__aurorae__svg__amber in .*kwinrc/);
    assert.deepEqual(snapshot(join(home, '.config')), config);
    assert.equal(existsSync(join(home, '.local')), false);
  });

  it('uninstall with nothing installed', () => {
    const { root, home } = makeRoot();
    const before = snapshot(root);
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /nothing is installed/i);
    assert.deepEqual(snapshot(root), before);
  });

  it('honours an absolute XDG_DATA_HOME and XDG_CACHE_HOME', () => {
    const { root, home } = makeRoot();
    const env = { XDG_DATA_HOME: join(root, 'data'), XDG_CACHE_HOME: join(root, 'cache') };
    mkdirSync(join(root, 'cache'));
    const before = snapshot(root);
    assert.equal(run('install', home, { env }).code, 0);
    assert.ok(existsSync(join(root, 'data/color-schemes/Amber.colors')));
    assert.deepEqual(readdirSync(home), []);
    put(join(root, 'cache/union', cacheName(join(root, 'data/union/styles/amber'))), 'amber');
    assert.equal(run('uninstall', home, { env }).code, 0);
    assert.deepEqual(snapshot(root), before);
  });

  it('ignores a relative XDG_DATA_HOME', () => {
    const { root, home } = makeRoot();
    const env = { XDG_DATA_HOME: 'rel', XDG_CACHE_HOME: 'relcache' };
    assert.equal(run('install', home, { env }).code, 0);
    assert.ok(existsSync(join(home, '.local/share/color-schemes/Amber.colors')));
    assert.deepEqual(readdirSync(root), ['home']);
    assert.equal(run('uninstall', home, { env }).code, 0);
    assert.deepEqual(readdirSync(home), []);
  });

  it('runs from any folder with spaces in HOME', () => {
    const { root, home } = makeRoot('my home');
    const before = snapshot(root);
    assert.equal(run('install', home, { cwd: '/' }).code, 0);
    assert.ok(existsSync(join(home, '.local/share/aurorae/themes/amber/decoration.svg')));
    assert.equal(run('uninstall', home, { cwd: '/' }).code, 0);
    assert.deepEqual(snapshot(root), before);
  });

  it('writes nothing outside HOME', () => {
    const { root, home } = makeRoot();
    const work = join(root, 'work');
    mkdirSync(work);
    assert.equal(run('install', home, { cwd: work }).code, 0);
    assert.deepEqual(readdirSync(root).sort(), ['home', 'work']);
    assert.deepEqual(readdirSync(work), []);
    assert.deepEqual(readdirSync(home), ['.local']);
    assert.equal(run('uninstall', home, { cwd: work }).code, 0);
    assert.deepEqual(readdirSync(work), []);
  });

  it('rejects arguments', () => {
    const { home } = makeRoot();
    for (const script of ['install', 'uninstall']) {
      assert.equal(run(script, home, { args: ['--bogus'] }).code, 2);
      const help = run(script, home, { args: ['--help'] });
      assert.equal(help.code, 0);
      assert.match(help.stdout, /usage/i);
    }
    assert.deepEqual(readdirSync(home), []);
  });

  it('takes the parts from AMBER_PARTS when it is set', () => {
    const { root, home } = makeRoot();
    const parts = join(root, 'parts');
    for (const [from] of targets()) put(join(parts, from), readFileSync(join(PARTS, from)));
    put(join(parts, 'colour-scheme/Amber.colors'), 'changed');
    assert.equal(run('install', home, { env: { AMBER_PARTS: parts } }).code, 0);
    assert.equal(readFileSync(join(home, '.local/share/color-schemes/Amber.colors'), 'utf8'), 'changed');
  });
});
