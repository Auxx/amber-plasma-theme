#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UsageError, main, print, table } from '../lib/cli.mjs';
import { colourCounts, coolGreys, fill, frame, markPixels, tokenNames } from '../lib/image.mjs';
import { decodePng, encodePng } from '../lib/png.mjs';
import { loadTokens } from '../lib/tokens.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));

function readPicture(positionals) {
  if (positionals.length !== 1) {
    throw new UsageError('Give one PNG file.');
  }
  return decodePng(readFileSync(positionals[0]));
}

/** `x,y,width,height` → a region; absent → the whole picture. */
function parseRegion(text) {
  if (text === undefined) {
    return undefined;
  }
  const parts = text.split(',');
  if (parts.length !== 4 || !parts.every(p => /^\d+$/.test(p))) {
    throw new UsageError(`--region must be x,y,width,height in whole pixels: ${text}`);
  }
  const [ x, y, width, height ] = parts.map(Number);
  if (width < 1 || height < 1) {
    throw new UsageError(`--region must be at least 1 pixel wide and high: ${text}`);
  }
  return { x, y, width, height };
}

/** A path for --mark: a .png inside the repository (tooling rule 6). */
function markPath(text) {
  const path = resolve(text);
  if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || !path.endsWith('.png')) {
    throw new UsageError(`--mark must be a .png file inside the repository: ${text}`);
  }
  return path;
}

const REGION_HELP = `--region x,y,width,height looks only at that rectangle of
the picture, in pixels from its top left corner.`;

main({
  name: 'image',
  summary: 'Reads the colours of a PNG picture: cool greys, colours named as tokens, rounded corners and lines.',
  commands: {
    greys: {
      usage: '<png> [--region x,y,w,h] [--mark <out.png>] [--json]',
      summary: 'Lists the cool greys of the picture; exits 1 when there is one',
      help: `A cool grey is a colour that is not a hue (OKLCH chroma below
0.05) and is neither warm (hue 30 to 110) nor black: the rule of the
prototype check, with "no hue" only below chroma 0.001, as r = g = b is.
Each colour is listed with its pixel count and the box that holds them.
${REGION_HELP}
--mark <out.png> writes a copy of the picture with those pixels in magenta.
It must be inside the repository, such as tmp/; it is the only thing written.`,
      options: { region: { type: 'string' }, mark: { type: 'string' }, json: { type: 'boolean' } },
      run(values, positionals) {
        const region = parseRegion(values.region);
        const out = values.mark === undefined ? undefined : markPath(values.mark);
        const picture = readPicture(positionals);
        const found = coolGreys(picture, { region });
        if (out) {
          writeFileSync(out, encodePng(markPixels(picture, found.map(f => f.hex))));
        }
        const marked = out ? relative(root, out) : undefined;
        print(values.json, { greys: found, marked }, () => {
          const lines = found.length
            ? [ table(found.map(({ hex, count, box: b }) => [ hex, `${count} px`, `at ${b.x},${b.y} ${b.width}×${b.height}` ])) ]
            : [ 'no cool grey' ];
          if (marked) {
            lines.push(`marked: ${marked}`);
          }
          return lines.join('\n');
        });
        return found.length ? 1 : 0;
      }
    },
    colours: {
      usage: '<png> [--region x,y,w,h] [--top 20] [--json]',
      summary: 'Lists the most common colours of the picture, named as tokens where one matches',
      help: `A colour is named after the first opaque colour token, in the
order of the tokens file, that has exactly its hex.
${REGION_HELP}
--top n lists only the n most common colours (default 20; 0 lists all).`,
      options: { region: { type: 'string' }, top: { type: 'string' }, json: { type: 'boolean' } },
      run(values, positionals) {
        const region = parseRegion(values.region);
        const top = values.top === undefined ? 20 : Number(values.top);
        if (!Number.isInteger(top) || top < 0) {
          throw new UsageError(`--top must be a whole number: ${values.top}`);
        }
        const counts = colourCounts(readPicture(positionals), { region, tokens: loadTokens() });
        const shown = top ? counts.slice(0, top) : counts;
        print(values.json, shown, () =>
          table(shown.map(({ hex, count, token }) => [ hex, `${count} px`, token ?? '' ])));
        return 0;
      }
    },
    states: {
      usage: '<folder> --case <name> --expect <json> [--alias probe=expected]... [--region x,y,w,h] [--surface <hex>] [--ignore <hex>]... [--foot <px> [--bar <hex> --bar-states <state,...>]] [--json]',
      summary: 'Compares the fill and text of each state of a probe case with the states a gallery row expects; exits 1 on a mismatch',
      help: `<folder> holds the probe's images and its manifest.json, a list of
{ file, widget, state, reached }. --case names the widget; --expect is a file
written by \`browser states --json\`. Each probe state is matched to the
expected state of the same name, or of the name --alias gives it, such as
--alias hovered-focused=focused (repeatable).

The fill of an image is its most common colour, and the text the colour
farthest from it: small text at scale 1 is mostly anti-aliased blends, and
only a few pixels reach the full text colour. Both are compared by hex,
within 1 a channel. A state on
one side only is listed as "not compared". --surface leaves out pixels of that
colour, the probe's surface, from both, and --ignore (repeatable) another
colour, such as a text cursor.

--region x,y,width,height reads every image only inside that rectangle, such
as a check box's box or a slider's thumb, which are too small to be the most
common colour of their widget (P3.5). An expected background or text of null,
which browser states writes for a transparent property, is not compared, and
is printed as "—".

--foot <px> leaves the bottom rows out of the fill and the text and reads
their colour, the foot (P3.4). With --bar, a state named in --bar-states
passes only when its foot is the --bar colour, the focus bar of a focused
well, and every other state only when its foot is its own fill.`,
      options: { case: { type: 'string' }, expect: { type: 'string' }, alias: { type: 'string', multiple: true }, region: { type: 'string' }, surface: { type: 'string' }, ignore: { type: 'string', multiple: true }, foot: { type: 'string' }, bar: { type: 'string' }, 'bar-states': { type: 'string' }, json: { type: 'boolean' } },
      run(values, positionals) {
        if (positionals.length !== 1) {
          throw new UsageError('Give the probe folder.');
        }
        if (!values.case) {
          throw new UsageError('Give --case, the widget name of the probe.');
        }
        if (!values.expect) {
          throw new UsageError('Give --expect, a file written by browser states --json.');
        }
        for (const [ name, hex ] of [ [ 'surface', values.surface ], [ 'bar', values.bar ], ...(values.ignore ?? []).map(h => [ 'ignore', h ]) ]) {
          if (hex !== undefined && !/^#[0-9a-fA-F]{6}$/.test(hex)) {
            throw new UsageError(`--${name} must be a colour as #rrggbb: ${hex}`);
          }
        }
        const foot = values.foot === undefined ? 0 : Number(values.foot);
        if (!Number.isInteger(foot) || foot < 1 && values.foot !== undefined) {
          throw new UsageError(`--foot must be a whole number of rows above 0: ${values.foot}`);
        }
        if (values.bar !== undefined && !foot) {
          throw new UsageError('--bar needs --foot, the height of the bar.');
        }
        if (values['bar-states'] !== undefined && values.bar === undefined) {
          throw new UsageError('--bar-states needs --bar, the colour of the bar.');
        }
        const region = parseRegion(values.region);
        const bar = values.bar?.toLowerCase();
        const barStates = new Set((values['bar-states'] ?? '').split(',').filter(Boolean));
        const ignore = (values.ignore ?? []).map(h => h.toLowerCase());
        const aliases = new Map();
        for (const text of values.alias ?? []) {
          const [ from, to, extra ] = text.split('=');
          if (!from || !to || extra !== undefined) {
            throw new UsageError(`--alias must be probe-state=expected-state: ${text}`);
          }
          aliases.set(from, to);
        }
        const folder = positionals[0];
        const manifest = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8')).filter(m => m.widget === values.case);
        if (!manifest.length) {
          throw new Error(`${values.case}: no image in ${join(folder, 'manifest.json')}`);
        }
        const expected = JSON.parse(readFileSync(values.expect, 'utf8'));
        const names = tokenNames(loadTokens());
        const surface = values.surface?.toLowerCase();
        const close = (a, b) => a !== null && b !== null && [ 1, 3, 5 ].every(i => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= 1);
        const agrees = (found, want) => want === null || close(found, want);
        const used = new Set();
        const rows = manifest.map(({ file, state, reached }) => {
          const target = expected.find(e => e.state === (aliases.get(state) ?? state));
          if (!target) {
            return { state, reached, compared: false };
          }
          used.add(target.state);
          const found = fill(decodePng(readFileSync(join(folder, file))), { surface, region, foot, ignore });
          // An expectation of null is not compared (P3.5).
          const want = { background: target.background?.hex ?? null, text: target.text?.hex ?? null };
          if (foot) {
            want.foot = bar && barStates.has(state) ? bar : found.background;
          }
          const match = agrees(found.background, want.background) && agrees(found.text, want.text) && (!foot || close(found.foot, want.foot));
          return { state, reached, compared: true, expected: target.state, found, want, match };
        });
        for (const e of expected) {
          if (!used.has(e.state) && !rows.some(r => r.state === e.state)) {
            rows.push({ state: e.state, compared: false, expectedOnly: true });
          }
        }
        const failed = rows.some(r => r.compared && !r.match);
        const named = hex => (hex === null ? 'none' : `${hex}${names.get(hex) ? ` (${names.get(hex)})` : ''}`);
        print(values.json, rows, () => table(rows.map(r => {
          const note = r.reached === false ? ' (state not reached)' : '';
          if (!r.compared) {
            return [ r.state, `not compared${r.expectedOnly ? ' (no image)' : ' (no expectation)'}` ];
          }
          if (r.match) {
            const footNote = r.want.foot !== undefined ? `, foot ${named(r.found.foot)}` : '';
            const shown = (found, want) => (want === null ? '—' : named(found));
            return [ r.state, `ok  ${shown(r.found.background, r.want.background)} / ${shown(r.found.text, r.want.text)}${footNote}${note}` ];
          }
          const parts = [];
          if (!agrees(r.found.background, r.want.background)) {
            parts.push(`background ${named(r.found.background)} expected ${named(r.want.background)}`);
          }
          if (!agrees(r.found.text, r.want.text)) {
            parts.push(`text ${named(r.found.text)} expected ${named(r.want.text)}`);
          }
          if (r.want.foot !== undefined && !close(r.found.foot, r.want.foot)) {
            parts.push(`foot ${named(r.found.foot)} expected ${named(r.want.foot)}`);
          }
          return [ r.state, parts.join('; ') + note ];
        })));
        return failed ? 1 : 0;
      }
    },
    frame: {
      usage: '<png> --surface <hex> [--region x,y,w,h] [--json]',
      summary: 'Finds rounded corners and lines 1 or 2 px thick on a widget drawn on a surface; exits 1 when there is one',
      help: `The widget is every pixel that is not the --surface colour (±1 a
channel; a fully transparent pixel counts as surface); choose a surface colour
the widget does not use. Nothing is judged unless one colour fills half the
widget's box, which text never does. A side is judged only
when its longest run of drawn pixels covers a quarter of it, so text alone
is not judged; a corner only when both its sides are. A corner is rounded
when its pixel is nearer the surface than the widget's most common colour
and than the outer colour of its two sides, such as a focus bar's.
A side has a line when its outer colour differs from the colour 3 px in and
runs for 1 or 2 px, or when the whole widget is only 1 or 2 px across it;
3 px or more is a band, such as a focus bar.
${REGION_HELP}`,
      options: { surface: { type: 'string' }, region: { type: 'string' }, json: { type: 'boolean' } },
      run(values, positionals) {
        if (!/^#[0-9a-fA-F]{6}$/.test(values.surface ?? '')) {
          throw new UsageError(`--surface must be a colour as #rrggbb: ${values.surface ?? '(missing)'}`);
        }
        const region = parseRegion(values.region);
        const result = frame(readPicture(positionals), { surface: values.surface.toLowerCase(), region });
        const names = { tl: 'top left', tr: 'top right', bl: 'bottom left', br: 'bottom right' };
        const failed = Object.values(result.corners).includes('rounded') || Object.values(result.sides).includes('line');
        print(values.json, result, () => {
          if (!result.drawn) {
            return 'nothing drawn';
          }
          const lines = [];
          for (const [ side, verdict ] of Object.entries(result.sides)) {
            if (verdict === 'line') {
              lines.push(`${side}: line ${result.lines[side].hex} ${result.lines[side].thickness} px`);
            }
          }
          for (const [ corner, verdict ] of Object.entries(result.corners)) {
            if (verdict === 'rounded') {
              lines.push(`${names[corner]}: rounded`);
            }
          }
          const judged = Object.values(result.sides).filter(v => v !== 'not judged').length;
          const { x, y, width, height } = result.box;
          lines.push(`box ${x},${y} ${width}×${height}${judged ? '' : ' (no side judged)'}`);
          return lines.join('\n');
        });
        return failed ? 1 : 0;
      }
    }
  }
});
