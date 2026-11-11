# Tools

Run every tool from the repository root:
`node tools/src/bin/<tool>.mjs <command> [arguments] [options]`.

| Tool                | For                                                                |
| ------------------- | ------------------------------------------------------------------ |
| [`colour`](#colour) | Converting colours, WCAG contrast, finding a lightness that passes |
| [`tokens`](#tokens) | Reading Amber's tokens, checking and trying their contrast pairs   |

## `colour`

Colour maths with [culori](https://culorijs.org/).

| Command                                            | Does                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `convert <value...>`                               | Prints OKLCH, hex and rgb, and whether the colour is inside sRGB    |
| `contrast <fg> <bg...> [--min 4.5]`                | The WCAG 2.2 ratio of `fg` on background layers, bottom layer first |
| `solve <bg...> --hue <h> --chroma <c> [--min 4.5]` | The OKLCH lightness ranges in which that hue and chroma passes      |

`solve` also takes `--alpha <0–1>` (default 1), the opacity of the colour
being solved, for a part-transparent colour such as a glow.

A value is any CSS colour: `#d1b072`, `rgb(209 176 114 / 45%)`,
`oklch(77% 0.09 82)`, `white`. Token names are not understood here: use
[`tokens resolve`](#tokens) to get a token's colour, and `tokens try` to see a
token change against its pairs. Every command takes `--json`.

```shell
# The old dim text on tone 3: prints "4.56:1 pass (close)", exits 0
node tools/src/bin/colour.mjs contrast '#9c958a' '#312e29' --min 4.5

# A focused glow, accent at 45 % over tone 2: prints "2.67:1 FAIL (< 3)", exits 1
node tools/src/bin/colour.mjs contrast 'rgb(209 176 114 / 45%)' '#25221f' --min 3

# How light a warm neutral must be to carry text on tone 4: prints "71%–100% …", exits 0
node tools/src/bin/colour.mjs solve '#3c3832' --hue 80 --chroma 0.015 --min 4.5
```

- **Layers.** Background layers are listed from the bottom up and painted
  each over the last, in sRGB with 8 bits per channel. The bottom layer must
  be opaque. When it is not, the ratio means nothing: `contrast` says so and
  fails any `--min`, and `solve` refuses with exit code 1.
- **A part-transparent foreground**, such as a glow, is painted over the
  background before measuring, so the ratio is that of what is seen.
- **`--min`.** `contrast --min` exits with 1 when the ratio is below the
  minimum. Without `--min` it only prints the ratio.
- **Close.** A ratio that passes by less than 2 % is printed as
  `pass (close)` and has `close: true` in the JSON. Treat it as a warning: a
  small change of either colour may fail it.
- **Outside sRGB.** Colours outside sRGB are clipped per channel; `convert`
  marks them `OUT (clipped)` and `solve` lists the clipped ranges.
- **A failing ratio that rounds up to the minimum** is printed with a third
  decimal, as in `4.478:1 FAIL (< 4.48)`.
- **Number options** take plain decimal numbers within their range: `--min`
  from 1 to 21, `--alpha` from 0 to 1, `--chroma` 0 or more. Write a negative
  value as `--hue=-30`.
- **Exit codes.** 0 success; 1 a ratio is below `--min`, or a value is not a
  colour (the message names it); 2 the command line was wrong, including a
  number option that is not a number or is out of range.

## `tokens`

Reads `prototype/tokens.css` and `prototype/contrast-pairs.json` and measures
the pairs with the same maths as `colour`.

| Command                                                         | Does                                                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `list [filter]`                                                 | The tokens whose name contains the filter, with their values           |
| `resolve <token...> [--set token=value]`                        | Follows each token through `var()` to its colour: OKLCH and hex         |
| `pairs [filter] [--failing] [--close] [--set token=value]`      | Measures every contrast pair; exits with 1 when one fails or is missing |
| `try <token=value...>`                                          | The pairs a change would affect, before and after; exits 1 if one fails |

Every command takes `--json`. The `pairs` filter keeps pairs whose description
contains it, such as `text-dim` or `on tone-4`.

```shell
# Every pair: prints a table ending "17 pairs, 0 failing, 0 close.", exits 0
node tools/src/bin/tokens.mjs pairs

# Put dim text back to its old value: shows 5 changed pairs, one FAIL, exits 1
node tools/src/bin/tokens.mjs try 'text-dim=#9c958a'

# The colour of a token: prints "text-dim  -  oklch(71.5% 0.018 79.3)  #a9a297", exits 0
node tools/src/bin/tokens.mjs resolve text-dim
```

- **Token names** are written with or without the leading `--`. A name written
  with it must follow a `--` separator, since it looks like an option:
  `resolve --json -- --tone-2`.
- **Overrides.** `--set token=value` (repeatable) and each argument of `try`
  change a token before measuring. The value is `var(--other)` or a CSS colour.
  For `resolve`, an unknown name adds a new token; `pairs` and `try` refuse it
  (exit 1), since a new token can change no pair and a typo would read as
  safe. Nothing is written: to keep a value, edit
  `prototype/tokens.css`.
- **The tokens file** is one `:root { … }` block of `--name: value;`
  declarations, one per line, with `/* … */` comments. A value is a CSS colour
  or `var(--name)`. Anything else, a size such as `1px` included, is an error
  that names the file and line. The reader is extended when the first size
  token arrives (roadmap plan P1.2).
- **The pairs file** is a JSON array of
  `{ "foreground", "on", "minimum", "why" }`. Each item of `on` becomes one
  pair: a token name, or an array of names that are background layers from
  the bottom up. `minimum` is from 1 to 21; `why` names the accessibility rule.
- **Missing.** A pair whose token does not exist, or whose background layers
  together are not opaque, is `MISSING` and counts as failing. A
  part-transparent layer is fine when an opaque layer lies over it, or under it
  at the bottom.
- **Every foreground has a pair.** The test
  `tools/src/lib/amber-contrast.spec.mjs` fails when a token other than a tone
  or `danger` is the foreground of no pair.
- **Exit codes.** 0 success; 1 a pair fails or is missing, a token is unknown,
  or a value is not a colour; 2 the command line was wrong, including an
  override that is not `token=value`.
