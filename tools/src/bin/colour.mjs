#!/usr/bin/env node
// Ported from front-burner tools/ai-tools (MIT, same author).
import { main, print, table, UsageError } from '../lib/cli.mjs';
import { describeColour, isClose, measureContrast, parseColour, solveLightness } from '../lib/colour.mjs';

const VALUE_HELP = 'A value is any CSS colour: #d1b072, rgb(209 176 114 / 45%), oklch(55% 0.19 262), white.';

const jsonOption = { json: { type: 'boolean' } };

/** Reads a numeric option; a value that is not a finite number is a usage error. */
function number(name, text) {
  const value = Number(text);
  if (text.trim() === '' || !Number.isFinite(value)) {
    throw new UsageError(`--${name} must be a number`);
  }
  return value;
}

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
        const min = options.min === undefined ? undefined : number('min', options.min);
        const [ foreground, ...background ] = values.map(parseColour);
        const { ratio, opaque } = measureContrast(foreground, background);
        const result = {
          ratio: Number(ratio.toFixed(2)),
          opaque,
          pass: min === undefined ? undefined : ratio >= min,
          close: min !== undefined && isClose(ratio, min)
        };
        print(options.json, result, () =>
          `${result.ratio.toFixed(2)}:1${
            result.pass === undefined
              ? ''
              : result.close
              ? ' pass (close)'
              : result.pass
              ? ' pass'
              : ` FAIL (< ${min})`
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
        const result = solveLightness({
          background: values.map(parseColour),
          hue: number('hue', options.hue),
          chroma: number('chroma', options.chroma),
          minimum: number('min', options.min),
          alpha: number('alpha', options.alpha)
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
