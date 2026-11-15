import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { PARTS, ini, makeRoot, put, run, snapshot } from './install-fixtures.mjs';

/**
 * `install.sh --activate` and the restore in `uninstall.sh` (roadmap P6.2).
 * Activation selects every part in the throwaway home's configuration and
 * records each earlier value; uninstall puts every one back.
 */

const CONFIG_FILES = ['kdeglobals', 'kwinrc', 'konsolerc', 'katerc', 'kwriterc'];
const kwrite = (file, group, key, value) => {
  const groups = group.split('][').flatMap((g) => ['--group', g]);
  const args = value === null ? ['--delete'] : [value];
  const r = spawnSync('kwriteconfig6', ['--file', file, ...groups, '--key', key, ...args], {
    env: { PATH: process.env.PATH },
  });
  assert.equal(r.status, 0);
};

/** What `plasma-apply-colorscheme Amber` writes into an empty configuration folder. */
function appliedScheme(root, data) {
  const cfg = join(root, 'applied');
  mkdirSync(cfg);
  const r = spawnSync('plasma-apply-colorscheme', ['Amber'], {
    env: { PATH: process.env.PATH, HOME: root, XDG_CONFIG_HOME: cfg, XDG_DATA_HOME: data, QT_QPA_PLATFORM: 'offscreen' },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  return ini(join(cfg, 'kdeglobals'));
}

/** Every configuration file of a home, as ini() Maps. */
const settings = (cfg, extra = []) =>
  Object.fromEntries([...CONFIG_FILES.map((f) => join(cfg, f)), ...extra].map((f) => [f, ini(f)]));

const assertHas = (map, entries) => {
  for (const [k, v] of Object.entries(entries)) assert.equal(map.get(k), v, k);
};

describe('scripts/install.sh --activate', () => {
  it('activates every part on an empty home', () => {
    const { root, home } = makeRoot();
    const r = run('install', home, { args: ['--activate'] });
    assert.equal(r.code, 0, r.stderr);
    const cfg = join(home, '.config');
    const data = join(home, '.local/share');
    const globals = ini(join(cfg, 'kdeglobals'));
    const applied = appliedScheme(root, data);
    assert.equal(applied.get('General\tColorScheme'), 'Amber');
    assert.equal(applied.get('Colors:Header][Inactive\tBackgroundNormal'), '28,26,24');
    for (const [k, v] of applied) assert.equal(globals.get(k), v, k);
    assertHas(globals, { 'KDE\twidgetStyle': 'Union', 'KDE\tunionStyle': 'amber' });
    assertHas(ini(join(cfg, 'kwinrc')), {
      'org.kde.kdecoration2\tlibrary': 'org.kde.kwin.aurorae.v2',
      'org.kde.kdecoration2\ttheme': '__aurorae__svg__amber',
      'org.kde.kdecoration2\tBorderSize': 'Tiny',
      'org.kde.kdecoration2\tBorderSizeAuto': 'false',
    });
    assertHas(ini(join(cfg, 'konsolerc')), { 'Desktop Entry\tDefaultProfile': 'Amber.profile' });
    const profile = join(data, 'konsole/Amber.profile');
    assertHas(ini(profile), {
      'Appearance\tColorScheme': 'Amber',
      'General\tName': 'Amber',
      'General\tParent': 'FALLBACK/',
    });
    const record = readFileSync(join(data, 'amber/installed'), 'utf8').split('\n');
    assert.ok(record.includes(`file ${profile}`));
    for (const f of ['katerc', 'kwriterc']) {
      assertHas(ini(join(cfg, f)), {
        'KTextEditor Renderer\tColor Theme': 'Amber',
        'KTextEditor Renderer\tAuto Color Theme Selection': 'false',
      });
    }
  });

  it('round trip with --activate on an empty home', () => {
    const { root, home } = makeRoot();
    const before = snapshot(root);
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(snapshot(root), before);
  });

  it("round trip restores the owner's settings", () => {
    const { home } = makeRoot();
    const cfg = join(home, '.config');
    put(join(cfg, 'kdeglobals'), '[Colors:View]\nBackgroundNormal=35,38,41\n\n[General]\nColorScheme=BreezeDark\n\n[KDE]\nSingleClick=false\nwidgetStyle=Breeze\n');
    put(join(cfg, 'kwinrc'), '[Windows]\nFocusPolicy=ClickToFocus\n\n[org.kde.kdecoration2]\nlibrary=org.kde.breeze\ntheme=Breeze\n');
    put(join(cfg, 'katerc'), '[KTextEditor Renderer]\nAuto Color Theme Selection=true\nColor Theme=Breeze Dark\n');
    const before = settings(cfg);
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    assert.equal(ini(join(cfg, 'kdeglobals')).get('General\tColorScheme'), 'Amber');
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    assert.deepEqual(settings(cfg), before);
  });

  it('uses the default Konsole profile', () => {
    const { home } = makeRoot();
    const cfg = join(home, '.config');
    const data = join(home, '.local/share');
    const profile = join(data, 'konsole/Profile 1.profile');
    put(join(cfg, 'konsolerc'), '[Desktop Entry]\nDefaultProfile=Profile 1.profile\n');
    put(profile, '[General]\nCommand=/usr/bin/fish\nName=Profile 1\nParent=FALLBACK/\n');
    const before = ini(profile);
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    assert.equal(ini(profile).get('Appearance\tColorScheme'), 'Amber');
    assert.equal(existsSync(join(data, 'konsole/Amber.profile')), false);
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(ini(profile), before);
  });

  it('refuses an Amber.profile it did not write', () => {
    const { root, home } = makeRoot();
    const mine = join(home, '.local/share/konsole/Amber.profile');
    put(mine, 'mine');
    const before = snapshot(root);
    const r = run('install', home, { args: ['--activate'] });
    assert.equal(r.code, 1);
    assert.ok(r.stderr.includes(mine), r.stderr);
    assert.deepEqual(snapshot(root), before);
  });

  it('keeps a setting changed after install', () => {
    const { home } = makeRoot();
    const cfg = join(home, '.config');
    put(join(cfg, 'kwinrc'), '[org.kde.kdecoration2]\nlibrary=org.kde.breeze\ntheme=Breeze\n');
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    kwrite(join(cfg, 'kwinrc'), 'org.kde.kdecoration2', 'BorderSize', 'Normal');
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    const kwin = ini(join(cfg, 'kwinrc'));
    assertHas(kwin, { 'org.kde.kdecoration2\tBorderSize': 'Normal', 'org.kde.kdecoration2\ttheme': 'Breeze' });
    assert.equal(kwin.has('org.kde.kdecoration2\tBorderSizeAuto'), false);
    assert.match(r.stdout, /^kept .*kwinrc \[org\.kde\.kdecoration2\] BorderSize=Normal/m);
  });

  it('leaves a setting that already selected Amber', () => {
    const { home } = makeRoot();
    const cfg = join(home, '.config');
    put(join(cfg, 'kdeglobals'), '[General]\nColorScheme=Amber\n');
    put(join(cfg, 'kwinrc'), '[org.kde.kdecoration2]\ntheme=__aurorae__svg__amber\n');
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    const record = readFileSync(join(home, '.local/share/amber/installed'), 'utf8');
    assert.doesNotMatch(record, /\tColorScheme\t/);
    assert.doesNotMatch(record, /\ttheme\t/);
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    assert.equal(ini(join(cfg, 'kdeglobals')).get('General\tColorScheme'), 'Amber');
    assert.equal(ini(join(cfg, 'kwinrc')).get('org.kde.kdecoration2\ttheme'), '__aurorae__svg__amber');
    assert.match(r.stdout, /Still selected: ColorScheme=Amber/);
    assert.match(r.stdout, /Still selected: theme=__aurorae__svg__amber/);
  });

  it('applies the colour scheme again over an older Amber', () => {
    const { root, home } = makeRoot();
    const cfg = join(home, '.config');
    put(join(cfg, 'kdeglobals'), '[Colors:View]\nBackgroundNormal=1,2,3\n\n[General]\nColorScheme=Amber\nColorSchemeHash=0000\n');
    const before = settings(cfg);
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    const applied = appliedScheme(root, join(home, '.local/share'));
    const globals = ini(join(cfg, 'kdeglobals'));
    for (const k of ['Colors:View\tBackgroundNormal', 'General\tColorSchemeHash', 'General\tColorScheme']) {
      assert.equal(globals.get(k), applied.get(k), k);
    }
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(settings(cfg), before);
  });

  it('activates twice like once', () => {
    const { home } = makeRoot();
    const cfg = join(home, '.config');
    put(join(cfg, 'kwinrc'), '[org.kde.kdecoration2]\nBorderSize=Normal\ntheme=Breeze\n');
    put(join(cfg, 'kdeglobals'), '[General]\nColorScheme=BreezeDark\n');
    const before = settings(cfg);
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    const again = run('install', home, { args: ['--activate'] });
    assert.equal(again.code, 0, again.stderr);
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(settings(cfg), before);
  });

  it('plain install keeps an activation', () => {
    const { home } = makeRoot();
    const cfg = join(home, '.config');
    put(join(cfg, 'kwinrc'), '[org.kde.kdecoration2]\ntheme=Breeze\n');
    const before = settings(cfg);
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    assert.equal(run('install', home).code, 0);
    assert.equal(ini(join(cfg, 'kwinrc')).get('org.kde.kdecoration2\ttheme'), '__aurorae__svg__amber');
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(settings(cfg), before);
  });

  it('writes no setting without --activate', () => {
    const { home } = makeRoot();
    assert.equal(run('install', home).code, 0);
    assert.equal(existsSync(join(home, '.config')), false);
  });

  it('honours an absolute XDG_CONFIG_HOME', () => {
    const { root, home } = makeRoot();
    const env = { XDG_CONFIG_HOME: join(root, 'cfg') };
    assert.equal(run('install', home, { env, args: ['--activate'] }).code, 0);
    assert.equal(ini(join(root, 'cfg/kwinrc')).get('org.kde.kdecoration2\tBorderSize'), 'Tiny');
    assert.equal(existsSync(join(home, '.config')), false);
    assert.equal(run('uninstall', home, { env }).code, 0);

    const rel = makeRoot();
    const relEnv = { XDG_CONFIG_HOME: 'rel' };
    assert.equal(run('install', rel.home, { env: relEnv, args: ['--activate'] }).code, 0);
    assert.equal(ini(join(rel.home, '.config/kwinrc')).get('org.kde.kdecoration2\tBorderSize'), 'Tiny');
    assert.equal(existsSync(join(rel.root, 'rel')), false);
  });

  it('tells running programs only when given a bus', () => {
    const { root, home } = makeRoot();
    const bin = join(root, 'bin');
    const calls = join(root, 'calls');
    put(join(bin, 'dbus-send'), `#!/bin/bash\nprintf '%s\\n' "$*" >> '${calls}'\n`);
    chmodSync(join(bin, 'dbus-send'), 0o755);
    const PATH = `${bin}:${process.env.PATH}`;
    assert.equal(run('install', home, { env: { PATH }, args: ['--activate'] }).code, 0);
    assert.equal(existsSync(calls), false);
    assert.equal(run('uninstall', home, { env: { PATH } }).code, 0);
    assert.equal(existsSync(calls), false);

    const env = { PATH, DBUS_SESSION_BUS_ADDRESS: 'unix:path=/nonexistent' };
    const a = run('install', home, { env, args: ['--activate'] });
    assert.equal(a.code, 0, a.stderr);
    const afterInstall = readFileSync(calls, 'utf8').trim().split('\n');
    assert.equal(afterInstall.length, 1);
    assert.match(afterInstall[0], /--type=signal \/KWin org\.kde\.KWin\.reloadConfig/);
    assert.equal(run('uninstall', home, { env }).code, 0);
    const all = readFileSync(calls, 'utf8').trim().split('\n');
    assert.equal(all.length, 3);
    assert.ok(all.slice(1).some((c) => /\/KWin org\.kde\.KWin\.reloadConfig/.test(c)));
    assert.ok(all.slice(1).some((c) => /\/KGlobalSettings org\.kde\.KGlobalSettings\.notifyChange int32:0 int32:0/.test(c)));
  });

  it('removes an accent colour and puts it back', () => {
    const { root, home } = makeRoot();
    const cfg = join(home, '.config');
    put(join(cfg, 'kdeglobals'), '[General]\nAccentColor=0,0,255\nColorScheme=BreezeDark\n');
    const before = settings(cfg);
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    const globals = ini(join(cfg, 'kdeglobals'));
    assert.equal(globals.has('General\tAccentColor'), false);
    const applied = appliedScheme(root, join(home, '.local/share'));
    assert.equal(globals.get('Colors:Selection\tBackgroundNormal'), applied.get('Colors:Selection\tBackgroundNormal'));
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(settings(cfg), before);
  });

  it('activates again after the colour scheme changed', () => {
    const { root, home } = makeRoot();
    const cfg = join(home, '.config');
    put(join(cfg, 'kdeglobals'), '[General]\nColorScheme=BreezeDark\n');
    const before = settings(cfg);
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    const parts = join(root, 'parts');
    cpSync(PARTS, parts, { recursive: true });
    const colors = join(parts, 'colour-scheme/Amber.colors');
    writeFileSync(colors, readFileSync(colors, 'utf8').replace(/(\[Colors:Button\]\n(?:.*\n)*?BackgroundNormal=).*/, '$110,20,30'));
    const again = run('install', home, { env: { AMBER_PARTS: parts }, args: ['--activate'] });
    assert.equal(again.code, 0, again.stderr);
    assert.equal(ini(join(cfg, 'kdeglobals')).get('Colors:Button\tBackgroundNormal'), '10,20,30');
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    assert.doesNotMatch(r.stdout, /^kept/m);
    assert.deepEqual(settings(cfg), before);
  });

  it('records what it did when the colour scheme tool fails', () => {
    const { root, home } = makeRoot();
    const cfg = join(home, '.config');
    put(join(cfg, 'kdeglobals'), '[General]\nAccentColor=0,0,255\nColorScheme=Amber\nColorSchemeHash=0000\n');
    const before = settings(cfg);
    const bin = join(root, 'bin');
    put(join(bin, 'plasma-apply-colorscheme'), '#!/bin/bash\nexit 1\n');
    chmodSync(join(bin, 'plasma-apply-colorscheme'), 0o755);
    const r = run('install', home, { env: { PATH: `${bin}:${process.env.PATH}` }, args: ['--activate'] });
    assert.equal(r.code, 1);
    assert.equal(run('uninstall', home).code, 0);
    assert.deepEqual(settings(cfg), before);
  });

  it('keeps the session bus away from the colour scheme tool', () => {
    const { root, home } = makeRoot();
    const bin = join(root, 'bin');
    const seen = join(root, 'seen');
    const real = spawnSync('bash', ['-c', 'command -v plasma-apply-colorscheme'], { encoding: 'utf8' }).stdout.trim();
    put(join(bin, 'plasma-apply-colorscheme'),
      `#!/bin/bash\nprintf '%s|%s\\n' "\${DBUS_SESSION_BUS_ADDRESS-unset}" "\${XDG_RUNTIME_DIR-unset}" >> '${seen}'\nexec '${real}' "$@"\n`);
    chmodSync(join(bin, 'plasma-apply-colorscheme'), 0o755);
    const env = { PATH: `${bin}:${process.env.PATH}`, XDG_RUNTIME_DIR: join(root, 'runtime') };
    assert.equal(run('install', home, { env, args: ['--activate'] }).code, 0);
    assert.equal(readFileSync(seen, 'utf8').trim(), 'unix:path=/nonexistent|unset');
  });

  it('keeps a colour scheme the owner chose after install, whole', () => {
    const { root, home } = makeRoot();
    const cfg = join(home, '.config');
    mkdirSync(cfg);
    const apply = (name) => {
      const r = spawnSync('plasma-apply-colorscheme', [name], {
        env: { PATH: process.env.PATH, HOME: home, XDG_CONFIG_HOME: cfg, QT_QPA_PLATFORM: 'offscreen' }, encoding: 'utf8',
      });
      assert.equal(r.status, 0, r.stderr);
    };
    apply('BreezeLight');
    assert.equal(run('install', home, { args: ['--activate'] }).code, 0);
    apply('BreezeDark');
    const chosen = ini(join(cfg, 'kdeglobals'));
    const r = run('uninstall', home);
    assert.equal(r.code, 0, r.stderr);
    const globals = ini(join(cfg, 'kdeglobals'));
    for (const [k, v] of chosen) {
      if (k.startsWith('KDE\t')) continue;
      assert.equal(globals.get(k), v, k);
    }
    assert.equal(r.stdout.split('\n').filter((l) => l.startsWith('kept')).length, 1, r.stdout);
    assert.match(r.stdout, /^kept .*kdeglobals colour scheme BreezeDark/m);
    void root;
  });

  it('rejects arguments', () => {
    const { home } = makeRoot();
    assert.equal(run('install', home, { args: ['--activate', '--help'] }).code, 2);
    assert.equal(run('install', home, { args: ['--bogus'] }).code, 2);
    assert.equal(run('uninstall', home, { args: ['--activate'] }).code, 2);
    const help = run('install', home, { args: ['--help'] });
    assert.equal(help.code, 0);
    assert.match(help.stdout, /--activate/);
    assert.deepEqual(snapshot(home), []);
  });
});
