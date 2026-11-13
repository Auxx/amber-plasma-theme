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
| `states <page> --widget <name> --selector <css> [--fill-property=<name>] [--text-property=<name>]` | For each `.state` of the gallery row `.state-row[data-widget=<name>]`, in order: the background and text colour of the widget `--selector` finds in it, each with every token of that hex. A transparent widget takes the background of its nearest ancestor that has one, so a tool button with no fill reads as its toolbar. The text of an empty input or text area that has a placeholder is the placeholder's colour. `--fill-property` and `--text-property` read a property of the widget in their place, such as `--mark` (P3.5). Exits 1 when the row or a widget is missing |

Every command takes `--width` and `--height` (200 to 4000; default
1300 × 900, device scale 1) and `--json`.

```shell
# The rendered anti-goals: prints "0 load problems, 0 anti-goal offences.", exits 0
node tools/src/bin/browser.mjs check prototype/index.html

# The active window: prints "Saved tmp/index-scene-front.png (900 × 560)", exits 0
node tools/src/bin/browser.mjs shot prototype/index.html --selector .scene-front

# A hovered window button: prints a row "span.window-button.is-minimise  #1c1a18 (tone-1)  #e8e3da (text)", exits 0
node tools/src/bin/browser.mjs colours prototype/index.html '.scene-front .is-minimise' --hover '.scene-front .is-minimise'

# What a widget family must match (P3.3): rows such as "focused  #695c45 raised-focus  #e8e3da text, …", exits 0
node tools/src/bin/browser.mjs states prototype/gallery.html --widget button --selector .button --json > tmp/expect-button.json

# A check box's box and tick (P3.5): "rest  #d1b072 accent, …  #1b160b on-accent", exits 0
node tools/src/bin/browser.mjs states prototype/gallery.html --widget check-box-on --selector .check-box --text-property=--mark
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
- **`states`: a property in place of a colour** (P3.5). `--fill-property`
  and `--text-property` read a property of the widget, such as the gallery's
  `--mark` (a toggle's tick or dot), `--thumb-tone` or `--fill` (a range), as
  its background or text. Write a custom property's name after `=`:
  `--text-property=--mark`, since a value starting with `--` is otherwise read
  as an option. A transparent value is `null` in `--json` and `—` in the
  table: an unchecked box has no mark.
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
| `union-style-tokens [--write] [--json]` | `parts/union-style/amber/contents/css/tokens.css`: every token a widget uses, as Union CSS custom properties of the same names, from `prototype/tokens.css` (P3.2, D-97) |

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
- **The Union style's tokens** are written resolved, `--well: #151413;`,
  with a reference kept as a comment, `/* var(--tone-0) */`. Which tokens
  are written is the list `UNION_TOKENS` in `tools/src/lib/union-tokens.mjs`;
  add a token there when a rule of the style needs it. A missing or
  part-transparent token is refused with exit 1.
- **Exit codes.** 0 success; 1 the table was refused; 2 the command line was
  wrong, including an unknown part.

## `image`

Reads the colours of a PNG picture, such as a screenshot of an application
with one of Amber's parts. The PNG is decoded with `node:zlib` alone.

| Command | Does |
| --- | --- |
| `greys <png> [--region x,y,w,h] [--leave-out x,y,w,h]... [--mark <out.png>] [--json]` | Lists the cool greys, each with its pixel count and the box that holds them, skipping each `--leave-out` rectangle (such as a terminal area); exits 1 when there is one |
| `colours <png> [--region x,y,w,h] [--top 20] [--json]` | Lists the most common colours, named after a token when one has exactly that hex |
| `lines <png> [--region x,y,w,h] [--leave-out x,y,w,h]... [--min-length 32] [--blends] [--json]` | Lists the straight lines 1 or 2 px thick and at least 32 px long in a whole picture, such as a window, needing no surface; the blended row where two tones meet at a fractional scale is not a line, and so a seam whose colour lies between its sides (tone 1 between tones 0 and 2) is missed unless `--blends` is given; exits 1 when there is one |
| `frame <png> --surface <hex> [--region x,y,w,h] [--json]` | Finds rounded corners and lines 1 or 2 px thick on a widget drawn on a known surface; exits 1 when there is one |
| `states <folder> --case <name> --expect <json> [--alias probe=expected]... [--region x,y,w,h] [--surface <hex>] [--ignore <hex>]... [--foot <px> [--bar <hex> --bar-states <state,...>]] [--json]` | Compares the fill and text of each state of one probe case (from the folder's `manifest.json`) with the states `browser states --json` wrote, and with `--foot` the focus bar; exits 1 on a mismatch |

```shell
# A screenshot of Dolphin without its title bar: lists e.g. "#808080  312 px  at 40,96 18×18", exits 1
node tools/src/bin/image.mjs greys tmp/check-colour-scheme/shots/dolphin.png --region 0,30,1280,770 --mark tmp/check-colour-scheme/shots/dolphin-marked.png

# Konsole without its terminal area, which the terminal colours (P4.1) own (P3.9): "no cool grey" and "left out: 1 region", exits 0
node tools/src/bin/image.mjs greys tmp/check-colour-scheme/shots/p3.9-T-main.png --leave-out 0,90,1909,1000

# A push button drawn on magenta by the P3.2 probe: e.g. "top: line #d1b072 1 px", "top left: rounded", exits 1
node tools/src/bin/image.mjs frame tmp/check-colour-scheme/shots/p3.2-breeze/push-button-hovered.png --surface '#ff00ff'

# The hairlines in a shot of Dolphin (P3.9): rows such as "vertical  #1c1a18  1 px  at 209,66  1080 long", exits 1
node tools/src/bin/image.mjs lines tmp/check-colour-scheme/shots/p3.9-D-main-icons.png

# The ten most common colours of a selected item: "#d1b072  4120 px  accent" and so on
node tools/src/bin/image.mjs colours tmp/check-colour-scheme/shots/dolphin.png --region 220,120,600,24 --top 10

# The probe's push button against the gallery (P3.3): "rest  ok  #312e29 (tone-3) / #e8e3da (text)" per state; exits 1 on a mismatch
node tools/src/bin/image.mjs states tmp/check-colour-scheme/shots/p3.3-amber --case push-button --expect tmp/expect-button.json --alias hovered-focused=focused

# A text field against the gallery (P3.4): the focused states must carry the accent bar 3 px high, the others none
node tools/src/bin/image.mjs states tmp/check-colour-scheme/shots/p3.4-amber --case line-edit --expect tmp/expect-text-field.json --foot 3 --bar '#d1b072' --bar-states focused,hovered-focused --alias hovered-focused=focused

# A check box's box against the gallery (P3.5): the box only, from the probe's manifest regions
node tools/src/bin/image.mjs states tmp/check-colour-scheme/shots/p3.5-amber --case check-box-on --expect tmp/expect-check-box-on.json --region 0,5,16,16
```

- **`states`: fill and text.** The fill is an image's most common colour. The text is the colour farthest from the fill in RGB: small text at scale 1 is mostly anti-aliased blends, and only a few pixels reach the full text colour. An icon in another colour, such as a coloured arrow, would be taken for the text, so the probe draws text-only widgets. Both are compared by hex within ±1 a channel. A state on one side only is "not compared"; a state the probe could not reach is marked.
- **`states`: a region and no text** (P3.5). `--region x,y,w,h` reads every
  image only inside that rectangle, such as a toggle's box or a slider's
  thumb, which are too small to be their widget's most common colour. The
  probe writes each case's regions into its manifest. An expected background
  or text of `null` (from `browser states` on a transparent property) is not
  compared and is printed as `—`.
- **`states`: the foot and ignored colours** (P3.4). `--foot <px>` leaves the bottom rows out of the fill and the text, and reads their most common colour, the foot. With `--bar`, a state named in `--bar-states` passes only when its foot is the bar's colour, and every other state only when its foot is its own fill: a focus bar on a well that is not focused fails too. `--ignore <hex>` (repeatable) leaves a colour out of the fill, the text and the foot, such as a text cursor that `render()` draws.

- **A cool grey** is a colour that is not a hue (OKLCH chroma below 0.05)
  and is neither warm (hue 30 to 110) nor black: `warmthOffence` and
  `isHue` of `tools/src/lib/prototype-check.mjs`, the rule the prototype
  check uses. One difference (my call): a pixel counts as having no hue only
  below chroma 0.001, where r = g = b, since tone 0 itself has a chroma of
  only 0.003. Anti-aliased text, a mix of two warm colours, stays warm.
- **Rounding is excused** (my call): a colour within ±1 on each channel of a
  warm colour that has a hue is not reported. Two warm dark tones mixed at a
  part-pixel edge, such as a 1 px border at scale 1.49, round to colours like
  `#161515`. A grey with r = g = b is still reported: no rounding explains it.
  Text should be drawn with greyscale anti-aliasing: subpixel fringes are
  coloured and are reported.
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
- **`frame` reads a widget, not a screen** (P3.2, my call). Draw the widget
  alone on a surface of one known colour, as the P3.2 probe does with
  `QWidget.render()` at scale 1, on a colour the widget does not use, such as
  magenta `#ff00ff`: a widget filled with the surface's own colour shows only
  its text. The widget is every pixel that is not the surface (±1 a channel;
  fully transparent counts as surface).
  - Nothing is judged unless one colour fills at least half of the widget's
    box. Text never does, so the edges of glyphs are never read as lines.
  - A side is judged only when its longest run of drawn pixels covers a
    quarter of it, so text alone is not judged; a corner only when both its
    sides are.
  - A corner is **rounded** when its pixel is nearer the surface than the
    widget's most common colour and than the outer colour of its two sides:
    the corner of a band such as a focus bar, in a colour near the surface,
    is square (P3.4). A circle, such as a radio button, reports
    four rounded corners: a round widget is excused by the caller.
  - A side has a **line** when its outer colour differs from the colour 3 px
    in and runs for 1 or 2 px, or when the whole widget is only 1 or 2 px
    across that side, as a separator drawn alone is. A run of 3 px or more is
    a band, such as a focus bar or a block marker, and is not a line.
  - Colours are read without their alpha: a part-transparent pixel counts as
    its own colour. Draw on an opaque surface, as the probe does.
- **`--json`**: `greys` prints `{ greys: [{ hex, count, box, why }], marked }`;
  `colours` prints `[{ hex, count, token? }]`.
  `frame` prints `{ drawn, box, corners, sides, lines }`, each corner
  `square`, `rounded` or `not judged`, each side `clear`, `line` or
  `not judged`, and `lines.<side>` `{ hex, thickness }`.
- **Exit codes.** 0 success; 1 a cool grey was found, `frame` found a rounded corner or a line, or the picture could
  not be read; 2 the command line was wrong, including a region that is not
  four whole numbers, an empty region and a `--mark` path outside the
  repository.
