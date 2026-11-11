# Amber — Design language

> Status: **Accepted** on 2026-11-11

The look of Amber, as rules. The values here are the starting point taken from
the Sand mockup the owner chose; they are tuned in the prototype, and the
tokens file is the source once it exists. When this document and the tokens
file disagree about a value, the tokens file is right and this document is
updated.

## Principles

1. **Warm.** Every neutral leans warm. No cool grey. (decided)
2. **Square.** Every corner radius is zero. A round widget, such as a radio
   button or a round button, stays a circle. (decided)
3. **No lines.** No border, outline, separator or divider one pixel wide.
   Surfaces and widgets are told apart by tone. The one exception is the
   window outline, which tells overlapping windows apart. (decided, D-25)
4. **State is tone.** Hovered, focused and pressed widgets change tone.
   No widget glows. (decided) The active window is the one thing that
   glows. (decided, D-26)
5. **Quiet at rest.** A window full of widgets at rest shows accent only on
   what is selected, checked or filled.
   (my call)

## Starting tokens (my call)

| Token | Name | Value | Used for |
|---|---|---|---|
| tone 0 | `--tone-0` | `#151413` | title bar, wells, tracks of sliders and progress bars |
| tone 1 | `--tone-1` | `#1c1a18` | sidebars, secondary panels |
| tone 2 | `--tone-2` | `#25221f` | the main surface of a window |
| tone 3 | `--tone-3` | `#312e29` | raised widgets: buttons, selected items |
| tone 4 | `--tone-4` | `#3c3832` | hovered raised widgets |
| text | `--text` | `#e8e3da` | primary text and icons |
| dim text | `--text-dim` | `#a9a297` | secondary text, placeholders, inactive titles. Lightened from `#9c958a` in P1.1 to reach 4.5:1 on tone 4 (my call) |
| accent | `--accent` | `#d1b072` | selection, checked, progress, primary button, the tint of a focused widget |
| on-accent | `--on-accent` | `#1b160b` | text on accent |
| danger | `--danger` | `#b5442f` | close button when hovered, negative states |
| on-danger | `--on-danger` | `#fbf3e6` | text and icons on danger; the text token is too dark for it |

The values live in [`prototype/tokens.css`](../../prototype/tokens.css); when
this table and that file disagree, the file is right. Token names are written
without a prefix (my call, D-43). Further tones and the terminal and syntax
colours are settled in plan P1.6 and the gallery plans. Terminal and syntax colours are muted, warm-shifted hues
that sit with the Sand palette; the owner approves them in the prototype
before they go into real files.

## Surfaces

- A window is built from tones 0 to 2: title bar darkest, sidebars next, the
  main surface lightest.
- The menu bar and toolbar continue the title bar in tone 0, as one header.
  The status area is tone 1, like the sidebars. (my call; seen in the window
  shell of plan P1.2)
- Two surfaces that touch differ by at least one tone, unless they are meant
  to read as one area, as the header is.
- Menus, popups and tooltips are one tone away from what they cover and carry
  a shadow. They have no outline.

## Widgets

The tones of each state, as background / text (my call; seen in the gallery
of plans P1.3 and P1.4, `prototype/gallery.html`).

| Widget | At rest | Hovered | Focused | Pressed | Checked | Disabled |
|---|---|---|---|---|---|---|
| Button, combo box | tone 3 / text | tone 4 / text | raised focus / text | tone 1 / text | — | tone 3 / dim text |
| Primary button | accent / on-accent | accent hover / on-accent | accent hover / on-accent | accent pressed / on-accent | — | tone 3 / dim text |
| Tool button, on a tone 0 toolbar | no fill / text | tone 3 / text | raised focus / text | tone 2 / text | tone 3 / accent | no fill / dim text |
| Text field, spin box, text area | well / text | tone 1 / text | well focus / text | — | — | well / dim text |
| Close button | as title bar | danger fill | — | darker danger | — | — |

Toggles and ranges (my call, P1.4). Each cell gives the box / mark, the
thumb / fill, or the track / fill. A toggle's checked states are its own row.

| Widget | At rest | Hovered | Focused | Pressed | Disabled |
|---|---|---|---|---|---|
| Check box, radio button, unchecked | toggle / no mark | tone 1 | toggle focus | — | toggle |
| Check box, radio button, checked | accent / on-accent | accent hover / on-accent | accent hover / on-accent | — | toggle / dim text |
| Slider | tone 3 thumb / accent fill | tone 4 / accent | raised focus / accent | tone 1 / accent | tone 3 / dim text |
| Progress bar | track / accent fill | — | — | — | track / dim text |
| Scrollbar thumb | scroll thumb | dim text | — | text | — |

- **Precedence:** pressed wins over focused, and focused over hovered. A
  disabled widget never changes. (my call)
- **Pressed sinks.** A pressed button goes to tone 1, below the tone 2
  surface; a pressed tool button goes to tone 2, one below its hovered tone.
  (my call)
- **A checked tool button** keeps its accent text in every state. Hovered,
  it goes to tone 4, one above its checked tone; focused and pressed, it
  takes the tones of an unchecked tool button. (my call)
- **The primary button** shows focus with its hovered tone for now (my
  call); this is part of O-3 in the [decisions](decisions.md).
- **Wells:** a placeholder is dim text; selected text is on-accent on
  accent. A spin box's step buttons take no keyboard focus; the well around
  the field shows it.
- **The focused tone** is accent mixed over the tone a widget has when
  hovered. How strong it must be is open question O-3, and the gallery shows
  candidates with their measured contrast. The placeholder caps how strong
  a focused well's tint can be: see rule 4 of
  [accessibility](accessibility.md).
- **An empty well** is told from its surface by tone alone (open question
  O-1). The gallery shows candidates: a darker well, and a well edge.
- **Toggles** (my call, P1.4): a 16 px box, or a circle for a radio
  button, which is a round widget. Unchecked, it sits below the surface
  like a well; checked, it fills with accent and carries an on-accent mark:
  a tick with square ends, or a dot. A toggle has no pressed tone: held
  down, it stays hovered. Hovering its label hovers the box. Its label is
  dim text when it is disabled, and a disabled checked toggle keeps its
  mark in dim text. A checked toggle shows focus with its hovered tone, as
  the primary button does (part of O-3).
- **An unchecked toggle** is told from its surface by tone alone (O-1); the
  gallery shows a darker box beside lighter ones.
- A selected list or sidebar item has a tone 3 background. It may carry a
  block marker in accent on its leading edge.
- **Ranges** (my call, P1.4): a fill is accent on a 6 px track below the
  surface; a disabled fill is dim text. A slider's thumb is a 10 × 20 px
  raised widget and takes the button's tones. Pressed, it goes to tone 1
  and nearly vanishes against a tone 0 track (seen in P1.4; the owner
  judges it in P1.7). A progress bar has no text on it. A busy progress
  bar needs motion and is drawn in P3.5.
- **Scrollbars** (my call, P1.4): a 12 px thumb with no track fill and no
  arrow buttons. At rest it is tone 4, hovered dim text, pressed text.

Tokens of the widgets (my call, P1.3 and P1.4; the owner chooses O-1 and O-3 in
P1.7). Mixes are in sRGB; a mix is written in the token's comment, and the
token holds the plain colour (D-47).

| Token | Starting value | Used for |
|---|---|---|
| `--well` | `var(--tone-0)` | a well at rest (O-1) |
| `--well-edge` | `var(--well)` | the colour of the well edge (O-1) |
| `--well-edge-width` | `0px` | its height: none at the start (O-1) |
| `--raised-focus` | `#695c45`, accent 30 % over tone 4 | a focused raised widget (O-3) |
| `--well-focus` | `#393226`, accent 16 % over tone 1 | a focused well (O-3) |
| `--accent-hover` | `#debc7d`, accent at OKLCH lightness 81 % | a hovered or focused primary button |
| `--accent-pressed` | `#ba995b`, accent at OKLCH lightness 70 % | a pressed primary button |
| `--toggle` | `var(--tone-0)` | an unchecked toggle at rest (O-1) |
| `--toggle-focus` | `#393226`, accent 16 % over tone 1 | a focused unchecked toggle (O-3) |
| `--track` | `var(--tone-0)` | the track of a slider or progress bar (O-1) |
| `--scroll-thumb` | `var(--tone-4)` | a scrollbar's thumb at rest |

## Shadow

- **No glow and no shadow on a widget.** Union draws neither in Qt Widgets
  applications (see [platform](platform.md)), so the prototype uses neither.
  Wells and pressed widgets are shown by tone alone.
- A shadow under a popup, menu or inactive window is dark, soft and offset
  downwards. The active window has a window glow in its place; see "Window
  decoration".
  Whether Union draws one under menus and popups is unverified; see
  [platform](platform.md).

## Window decoration

- Title bar in tone 0; square corners.
- A window has a window outline. (decided, D-25) It runs along every edge,
  square at the corners, for active and inactive windows; it starts one
  pixel wide and sits lighter than tone 0 (my call). Its width, its colour
  and the contrast it must reach are open question O-4 in the
  [decisions](decisions.md). A maximised window has none (my call).
- No other line: none between the title bar and the content.
- The active window has a window glow: a soft light in accent on every
  side, outside the window outline. An inactive window has a dark shadow
  in its place. (decided, D-26) Starting amounts (my call), from spike
  P0.6: the glow fades from 28 % to nothing over 24 px; the shadow is
  black and fades from 50 % over 24 px. They are settled with the window
  outline, in O-4. A maximised window has neither.
- Starting tokens of the decoration (my call, from P0.6; the owner chooses
  in P1.7, O-4). The prototype page shows candidates beside them, each
  with its measured contrast.

  | Token | Starting value | Used for |
  |---|---|---|
  | `--outline` | `var(--tone-4)` | the window outline |
  | `--outline-width` | `1px` | its width |
  | `--glow` | accent at 28 % | the window glow, at the window outline |
  | `--glow-size` | `24px` | how far the window glow fades to nothing |
  | `--shadow` | black at 50 % | the shadow of an inactive window |
  | `--shadow-size` | `24px` | how far the shadow fades to nothing |

- The prototype draws the window glow and the shadow as gradients from the
  window outline outwards, straight on the edges and round on the corners,
  as the Aurorae frame draws them (see [platform](platform.md), P0.6). It
  uses no `box-shadow`.
- Window buttons are flat and never glow, like every widget. Hovered minimise and maximise move up a tone; hovered close turns danger.
- An inactive window has dim title text.

## What must not appear

A rounded corner, a hairline, or a cool grey. A round widget is not a
rounded corner, and the window outline is the one hairline allowed. See the anti-goals in the
[vision](../product/vision.md).
