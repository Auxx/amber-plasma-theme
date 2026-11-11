#!/usr/bin/env node
// Ported from front-burner tools/ai-tools (MIT, same author).
import { main, print, table, UsageError } from '../lib/cli.mjs';
import { composite, describeColour, isClose, measureContrast, parseColour, solveLightness } from '../lib/colour.mjs';

const VALUE_HELP = 'A value is any CSS colour: #d1b072, rgb(209 176 114 / 45%), oklch(55% 0.19 262), white.';

const jsonOption = { json: { type: 'boolean' } };

/** Reads a numeric option; a value that is not a finite number is a usage error. */
function number(name, text, { min = -Infinity, max = Infinity } = {}) {
  // Decimal notation only: Number() would also read "0x10" or "1e3".
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text.trim())) {
    throw new UsageError(`--${name} must be a number`);
  }
  const value = Number(text);
  if (value < min || value > max) {
    const limits = max === Infinity ? `${min} or more` : `from ${min} to ${max}`;
    throw new UsageError(`--${name} must be ${limits}`);
  }
  return value;
}

// A WCAG contrast ratio lies between 1:1 and 21:1.
const RATIO = { min: 1, max: 21 };

main({
  name: 'colour',
  summary: 'Colour maths for Amber: conversion, WCAG contrast and lightness solving.',
  commands: {
    convert: {
      usage: '<value...> [--json]',
      summary: 'Prints each value as OKLCH, hex and rgb, and whether it is inside the sRGB gamut.',
      help: VALUE_HELP,
      options: jsonOption,
      run(options, values) {
        if (!values.length) {
          throw new UsageError('Give at least one value');
        }
        const results = values.map(value => ({ value, ...describeColour(parseColour(value)) }));
        print(options.json, results, () =>
          table([
            [ 'value', 'oklch', 'hex', 'rgb', 'sRGB' ],
            ...results.map(r => [ r.value, r.oklch, r.hex, r.rgb, r.inGamut ? 'in' : 'OUT (clipped)' ])
          ]));
      }
    },
    contrast: {
      usage: '<foreground> <background...> [--min 4.5] [--json]',
      summary: 'The WCAG 2.2 contrast ratio of a foreground on background layers, listed from the bottom up.',
      help: `${VALUE_HELP}

Layers are painted each one over the last, in sRGB with 8 bits per channel,
and the foreground is painted over them before measuring, so a
part-transparent foreground such as a glow is measured as it is seen.
Exits with 1 when --min is given and the ratio is below it.`,
      options: { ...jsonOption, min: { type: 'string' } },
      run(options, values) {
        if (values.length < 2) {
          throw new UsageError('Give a foreground and at least one background layer');
        }
        const min = options.min === undefined ? undefined : number('min', options.min, RATIO);
        const [ foreground, ...background ] = values.map(parseColour);
        const { ratio, opaque } = measureContrast(foreground, background);
        const result = {
          ratio: Number(ratio.toFixed(2)),
          opaque,
          // On a background that is not opaque the ratio means nothing, so it cannot pass.
          pass: min === undefined ? undefined : opaque && ratio >= min,
          close: min !== undefined && opaque && isClose(ratio, min)
        };
        print(options.json, result, () =>
          // A failing ratio that rounds up to the minimum is shown with a third decimal.
          `${ratio.toFixed(result.pass === false && opaque && Number(ratio.toFixed(2)) >= min ? 3 : 2)}:1${
            result.pass === undefined
              ? ''
              : result.close
              ? ' pass (close)'
              : result.pass
              ? ' pass'
              : result.opaque
              ? ` FAIL (< ${min})`
              : ' FAIL'
          }${result.opaque ? '' : ' (the background is not opaque; the bottom layer must be)'}`);
        return result.pass === false ? 1 : 0;
      }
    },
    solve: {
      usage: '<background...> --hue <deg> --chroma <c> [--min 4.5] [--alpha 1] [--json]',
      summary: 'The OKLCH lightness ranges in which a colour of that hue and chroma meets --min on the background.',
      help: `${VALUE_HELP}

Steps are 0.1 % of lightness. For a warm neutral, try --chroma 0.01 --hue 80.
Ranges where the chroma is outside sRGB (and so clipped) are listed too.`,
      options: {
        ...jsonOption,
        hue: { type: 'string' },
        chroma: { type: 'string' },
        min: { type: 'string', default: '4.5' },
        alpha: { type: 'string', default: '1' }
      },
      run(options, values) {
        if (!values.length || options.hue === undefined || options.chroma === undefined) {
          throw new UsageError('Give the background layers, --hue and --chroma');
        }
        const background = values.map(parseColour);
        if (composite(background).alpha !== 1) {
          throw new Error('The background is not opaque; the bottom layer must be');
        }
        const result = solveLightness({
          background,
          hue: number('hue', options.hue),
          chroma: number('chroma', options.chroma, { min: 0 }),
          minimum: number('min', options.min, RATIO),
          alpha: number('alpha', options.alpha, { min: 0, max: 1 })
        });
        const range = ({ from, to }) => `${from}%–${to}%`;
        print(options.json, result, () =>
          `${result.ranges.length ? result.ranges.map(range).join(', ') : 'no lightness meets the minimum'}${
            result.clipped.length ? ` (clipped: ${result.clipped.map(range).join(', ')})` : ''
          }`);
      }
    }
  }
});
