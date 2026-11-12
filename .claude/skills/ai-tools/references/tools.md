# Tools

Run every tool from the repository root:
`node tools/src/bin/<tool>.mjs <command> [arguments] [options]`.

| Tool                | For                                                                |
| ------------------- | ------------------------------------------------------------------ |
| [`colour`](#colour) | Converting colours, WCAG contrast, finding a lightness that passes |
| [`tokens`](#tokens) | Reading Amber's tokens, checking and trying their contrast pairs   |
| [`browser`](#browser) | Screenshots of the prototype in a state, the rendered anti-goal check, computed colours |
| [`generate`](#generate) | Generating Amber's parts from the tokens: the colour scheme |
| [`image`](#image) | The colours of a screenshot: cool greys, and colours named as tokens |

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
| `resolve <token...> [--set token=value]`                        | Follows each colour token through `var()` to its colour: OKLCH and hex  |
| `pairs [filter] [--failing] [--close] [--set token=value]`      | Measures every contrast pair; exits with 1 when one fails or is missing |
| `try <token=value...>`                                          | The pairs a change would affect, before and after; exits 1 if one fails |

Every command takes `--json`. The `pairs` filter keeps pairs whose description
contains it, such as `text-dim` or `on tone-4`.

```shell
# Every pair: prints a table ending "110 pairs, 0 failing, 0 close.", exits 0
node tools/src/bin/tokens.mjs pairs

# Put dim text back to its old value: shows 15 changed pairs, four FAIL, exits 1
node tools/src/bin/tokens.mjs try 'text-dim=#9c958a'

# The colour of a token: prints "text-dim  -  oklch(71.5% 0.018 79.3)  #a9a297", exits 0
node tools/src/bin/tokens.mjs resolve text-dim
```

- **Token names** are written with or without the leading `--`. A name written
  with it must follow a `--` separator, since it looks like an option:
  `resolve --json -- --tone-2`.
- **Overrides.** `--set token=value` (repeatable) and each argument of `try`
  change a token before measuring. The value takes any form the tokens file
  takes (below).
  For `resolve`, an unknown name adds a new token; `pairs` and `try` refuse it
  (exit 1), since a new token can change no pair and a typo would read as
  safe. Nothing is written: to keep a value, edit
  `prototype/tokens.css`.
- **The tokens file** is one `:root { … }` block of `--name: value;`
  declarations, one per line, with `/* … */` comments. A value is a CSS colour,
  `var(--name)`, a length in px such as `24px`, or a part-transparent colour
  `color-mix(in srgb, var(--name) N%, transparent)` with N above 0 and at
  most 100. Anything else, such as `1em`, `calc()` or a `color-mix` in
  another space, is an error that names the file and line.
- **Lengths** are listed by `list` but are not colours: `resolve` refuses
  one (exit 1, "… is a length (1px)"), and a pair that names one is
  `MISSING`.
- **A `color-mix` token** resolves to the colour it names with its alpha
  multiplied by N %, so `--glow` follows `--accent`. `list` prints it as
  written; a colour with alpha prints as `#000000 / 50%`.
- **The pairs file** is a JSON array of
  `{ "foreground", "on", "minimum", "why" }`. Each item of `on` becomes one
  pair: a token name, or an array of names that are background layers from
  the bottom up. `minimum` is from 1 to 21; `why` names the accessibility rule.
- **Missing.** A pair whose token does not exist, or whose background layers
  together are not opaque, is `MISSING` and counts as failing. A
  part-transparent layer is fine when an opaque layer lies over it, or under it
  at the bottom.
- **Every colour token is in a pair.** The test
  `tools/src/lib/amber-contrast.spec.mjs` fails when a colour token other
  than `shadow` is in no pair, as foreground or as a background layer.
- **The prototype is checked too.** `prototype-anti-goals.spec.mjs` runs
  `tools/src/lib/prototype-check.mjs` over the real files: every
  `prototype/*.html` page and every stylesheet but the tokens. Each page is
  listed in the spec with the stylesheets it links. In the CSS it fails
  on a rounded corner, a border, any `box-shadow`, `outline-*` other than the
  window outline on `.window`, `column-rule`, `text-decoration`, a
  `drop-shadow` filter, a `round` clip, an at-rule, and any colour written out
  (CSS named colours included) except a warm `--desktop`. In the page it fails
  on `<script>` (except a linked `<script src="name.js" defer></script>`,
  listed in the spec), `<style>`, `<hr>`, SVG `<line>`, `rx`/`ry`, a colour
  in an attribute, a `style` that sets anything but custom properties, and a colour
  set outside a candidate. A colour written outside the tokens must be warm:
  OKLCH hue 30 to 110, or black (my call). A candidate's `--ansi-*`
  override may be any hue with a chroma of at least 0.05: a hue is not a
  grey. A script (`prototype/*.js`) may
  only copy a value into `--value` (D-48). It is read against an allowlist:
  it may use only the names a slider needs (`document`, `querySelectorAll`,
  `addEventListener`, `setProperty`, `value`, `min`, `max`, `Number` and a few
  more, in `SCRIPT_NAMES`) and the names it declares itself. It fails on any
  other name, on bracket access, on `var(`, on a colour, and on any `.style`
  use but `.style.setProperty('--value'`. A page also fails on an `on…`
  attribute or a `javascript:` URL, quoted or not, entities decoded, and on
  `<script>` or `<style>` in any case. `prototype-candidates.spec.mjs`
  measures every ratio printed under a candidate again, with that figure's
  `style` overrides, and fails when one is stale; it lists how many figures
  and ratios each page has. `prototype-gallery.spec.mjs` reads the gallery's
  rows of states and, in Chrome, checks that each state is drawn in its
  tokens, that a live control in a real state matches its forced copy, the
  keyboard order, the placeholder colour and the rendered anti-goals; and
  that a slider's fill follows its value and that the real scrollbars share
  their rules with the drawn ones.
- **Exit codes.** 0 success; 1 a pair fails or is missing, a token is unknown,
  or a value is not a colour; 2 the command line was wrong, including an
  override that is not `token=value`.

## `browser`

Opens a prototype page in the installed Google Chrome through
[playwright-core](https://playwright.dev/). Nothing is downloaded; Firefox is
not driven, since playwright-core needs its own Firefox build. A page is a
path from the repository root, opened as `file://`.

| Command | Does |
| --- | --- |
| `shot <page> [--selector css] [--hover css] [--focus css] [--press css] [--out file.png] [--full] [--scrollbars] [--wait ms]` | Saves a PNG of one element, the viewport, or the whole page with `--full`; `--scrollbars` shows the scrollbars, which headless Chrome hides; `--wait` waits up to 10000 ms after the state, for what shows late, such as a tooltip |
| `check <page> [--hover css] [--focus css] [--press css]` | Lists load problems and anti-goals as Chrome draws the page, in a state, including a line drawn as a filled box (an element or a pseudo-element) less than 3 px thick; exits 1 if there is any |
| `colours <page> <selector> [--hover css] [--focus css] [--press css]` | The computed background and text colour of each element matched, named as tokens |

Every command takes `--width` and `--height` (200 to 4000; default
1300 × 900, device scale 1) and `--json`.

```shell
# The rendered anti-goals: prints "0 load problems, 0 anti-goal offences.", exits 0
node tools/src/bin/browser.mjs check prototype/index.html

# The active window: prints "Saved tmp/index-scene-front.png (900 × 560)", exits 0
node tools/src/bin/browser.mjs shot prototype/index.html --selector .scene-front

# A hovered window button: prints a row "span.window-button.is-minimise  #1c1a18 (tone-1)  #e8e3da (text)", exits 0
node tools/src/bin/browser.mjs colours prototype/index.html '.scene-front .is-minimise' --hover '.scene-front .is-minimise'
```

Look at a screenshot with the Read tool.

- **States.** `--hover`, `--focus` and `--press` each take a selector that must
  match exactly one element, or the command exits 1 naming the count. Focus is
  given as by the keyboard, so `:focus-visible` applies; press holds the mouse
  button down, so `:active` applies. `--selector` for `shot` must match one
  element too.
- **Where screenshots go.** By default `tmp/<page>-<selector>-<states>.png` in
  the repository, which is gitignored. `--out` may name another `.png` inside
  the repository or inside the system's temporary folder, such as
  `/tmp/a.png`, after following links. Any other path is refused (exit 2).
- **`check`** reports a file that fails to load, a console error and a script
  error, then each element (or its `::before` / `::after`) with a border, a
  rounded corner, a box shadow, an underline, or an outline anywhere but on
  `.window`. A `border-radius` of 50 % on a square element is a round widget
  and passes. With `--hover`, `--focus` or `--press` it checks the page in
  that state, which is where focus rings and state borders appear. It
  complements `prototype-anti-goals.spec.mjs`, which reads the source; `check`
  sees what the browser's defaults and the cascade add.
- **What `check` cannot see:** SVG `rx`, `clip-path` and `filter` shapes,
  `text-shadow`, `column-rule`, lines drawn with gradients, `::marker` and
  `::placeholder`, scrollbars, the inside of native controls (a native check
  box may be drawn rounded while its computed radius is 0), and errors after
  the page has loaded.
- **`colours`** reads any computed form (`rgb()`, `color(srgb …)` from a
  `color-mix`, `oklch()`) and names an opaque colour by every token that resolves to it, such
  as `#3c3832 (tone-4, thumb, selected)`, or prints the bare hex. Fully transparent is
  `transparent`; part-transparent is `rgb(r g b / N%)`, with no token name.
- **Chrome missing.** Every command that opens a page exits 1 with "Google
  Chrome could not be started …". The specs that need Chrome are skipped with
  that reason.
- **Exit codes.** 0 success; 1 a check found something, a page or element is
  missing, a state selector does not match exactly one element, or Chrome did
  not start; 2 the command line was wrong, including a bad size or `--out`.

## `generate`

Generates Amber's parts from the tokens. One command per part; each prints
the part and writes it only with `--write`. A generated part is committed, and
a test fails when it differs from what the generator makes now (D-92).

| Command | Does |
| --- | --- |
| `colour-scheme [--write] [--json]` | `parts/colour-scheme/Amber.colors` from `prototype/tokens.css` and `parts/colour-scheme/roles.json` |

```shell
# Print the colour scheme as it would be generated now; writes nothing, exits 0
node tools/src/bin/generate.mjs colour-scheme

# After a token changes: prints "parts/colour-scheme/Amber.colors: written", or "… unchanged"
node tools/src/bin/generate.mjs colour-scheme --write
```

- **Output.** Without `--write`, the file's text exactly, so it can be piped
  or compared with `cmp`. With `--write`, one line: `written`, or `unchanged`
  when the file already holds that text, which is then left alone.
- **`--json`** prints `{ part, file, changed, written, content }`. Without
  `--write`, `changed` says whether the file on disk differs and `written` is
  false.
- **Refusals.** The generator writes nothing and exits 1 when the table has a
  missing role, an unknown token, a token that is not opaque, a `rule` it has
  no code for, or a value that would break the file. The message lists every
  problem, one per line, each starting `group.key:`.
- **The same each time.** The file holds no date or path; groups and keys are
  sorted as KConfig sorts them. The format and the computed disabled amount
  are in [colour-scheme](../../../../docs/architecture/colour-scheme.md#generating).
- **Exit codes.** 0 success; 1 the table was refused; 2 the command line was
  wrong, including an unknown part.

## `image`

Reads the colours of a PNG picture, such as a screenshot of an application
with one of Amber's parts. The PNG is decoded with `node:zlib` alone.

| Command | Does |
| --- | --- |
| `greys <png> [--region x,y,w,h] [--mark <out.png>] [--json]` | Lists the cool greys, each with its pixel count and the box that holds them; exits 1 when there is one |
| `colours <png> [--region x,y,w,h] [--top 20] [--json]` | Lists the most common colours, named after a token when one has exactly that hex |

```shell
# A screenshot of Dolphin without its title bar: lists e.g. "#808080  312 px  at 40,96 18×18", exits 1
node tools/src/bin/image.mjs greys tmp/check-colour-scheme/shots/dolphin.png --region 0,30,1280,770 --mark tmp/check-colour-scheme/shots/dolphin-marked.png

# The ten most common colours of a selected item: "#d1b072  4120 px  accent" and so on
node tools/src/bin/image.mjs colours tmp/check-colour-scheme/shots/dolphin.png --region 220,120,600,24 --top 10
```

- **A cool grey** is a colour that is not a hue (OKLCH chroma below 0.05)
  and is neither warm (hue 30 to 110) nor black: `warmthOffence` and
  `isHue` of `tools/src/lib/prototype-check.mjs`, the rule the prototype
  check uses. One difference (my call): a pixel counts as having no hue only
  below chroma 0.001, where r = g = b, since tone 0 itself has a chroma of
  only 0.003. Anti-aliased text, a mix of two warm colours, stays warm.
- **Fully transparent pixels** are skipped; any other pixel is judged by its
  colour alone.
- **`--region x,y,width,height`** in whole pixels from the top left corner.
  Use it to leave out what the check is not about, such as a window
  decoration or a terminal area. A region outside the picture is an error.
- **`--mark <out.png>`** writes a copy with every cool grey pixel in magenta
  `#ff00ff`, to find them by eye. The path must be a `.png` inside the
  repository, such as under `tmp/`; it is the only file the tool writes, and
  the output ends with `marked: <path>`.
- **Token names.** A colour is named after the first opaque colour token, in
  the order of the tokens file, with exactly its hex. A colour that only
  comes close is not named.
- **PNGs read**: 8 bits a channel, RGB or RGBA, not interlaced. Any other
  type, a bad CRC or a file that is not a PNG is refused with exit 1 and a
  message saying why.
- **`--json`**: `greys` prints `{ greys: [{ hex, count, box, why }], marked }`;
  `colours` prints `[{ hex, count, token? }]`.
- **Exit codes.** 0 success; 1 a cool grey was found, or the picture could
  not be read; 2 the command line was wrong, including a region that is not
  four whole numbers, an empty region and a `--mark` path outside the
  repository.
