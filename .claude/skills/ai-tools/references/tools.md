# Tools

Run every tool from the repository root:
`node tools/src/bin/<tool>.mjs <command> [arguments] [options]`.

| Tool                | For                                                                |
| ------------------- | ------------------------------------------------------------------ |
| [`colour`](#colour) | Converting colours, WCAG contrast, finding a lightness that passes |

## `colour`

Colour maths with [culori](https://culorijs.org/).

| Command                                            | Does                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `convert <value...>`                               | Prints OKLCH, hex and rgb, and whether the colour is inside sRGB    |
| `contrast <fg> <bg...> [--min 4.5]`                | The WCAG 2.2 ratio of `fg` on background layers, bottom layer first |
| `solve <bg...> --hue <h> --chroma <c> [--min 4.5]` | The OKLCH lightness ranges in which that hue and chroma passes      |

A value is any CSS colour: `#d1b072`, `rgb(209 176 114 / 45%)`,
`oklch(77% 0.09 82)`, `white`. Token names are not understood yet; they come
with the `tokens` tool (roadmap plan P1.1). Every command takes `--json`.

```shell
# Dim text on tone 3: prints "4.56:1 pass (close)", exits 0
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
- **Exit codes.** 0 success; 1 a ratio is below `--min`, or a value is not a
  colour (the message names it); 2 the command line was wrong, including an
  option that should be a number and is not.
