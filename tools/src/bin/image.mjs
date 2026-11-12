#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UsageError, main, print, table } from '../lib/cli.mjs';
import { colourCounts, coolGreys, markPixels } from '../lib/image.mjs';
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
  summary: 'Reads the colours of a PNG picture: cool greys, and colours named as tokens.',
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
    }
  }
});
