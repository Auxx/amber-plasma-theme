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
without a prefix (my call, D-43). The tones of widgets are in "Widgets"
below; the terminal and syntax colours are in "Terminal colours" and
"Editor theme". The owner approves them in the prototype before they go
into real files.

## Surfaces

- A window is built from tones 0 to 2: title bar darkest, sidebars next, the
  main surface lightest.
- The menu bar and toolbar continue the title bar in tone 0, as one header.
  The status area is tone 1, like the sidebars. (my call; seen in the window
  shell of plan P1.2)
- Two surfaces that touch differ by at least one tone, unless they are meant
  to read as one area, as the header is.
- Menus, popups and tooltips are one tone away from what they cover and carry
  a shadow. They have no outline. A popup is `--popup`, tone 3, one above the
  tone 2 surface (my call, P1.5).

## Widgets

The tones of each state, as background / text (my call; seen in the gallery
of plans P1.3 to P1.5, `prototype/gallery.html`).

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
| Slider | thumb / accent fill | thumb hover / accent | raised focus / accent | thumb pressed / accent | tone 3 / dim text |
| Progress bar | track / accent fill | — | — | — | track / dim text |
| Scrollbar thumb | thumb | thumb hover | — | thumb pressed | — |

Navigation, views and popups (my call, P1.5). Each cell gives the
background / text, and the block marker or tick where the widget has one.

| Widget | At rest | Hovered | Focused | Pressed | Selected, checked or sorted | Disabled |
|---|---|---|---|---|---|---|
| Tab, on a tone 0 tab bar | no fill / text | tone 1 / text | well focus / text | — | selected: tone 2 / text, marker | no fill / dim text |
| Item (list, tree, table, sidebar) | no fill / text | tone 3 / text | raised focus / text | — | selected: selected / text, marker | no fill / dim text |
| Header section | no fill / dim text | tone 3 / text | — | tone 1 / text | sorted: no fill / text, sort arrow | — |
| Menu item, in a popup | no fill / text | tone 4 / text | tone 4 / text | — | checked: no fill / text, accent tick | no fill / dim text |

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
- **Selection** (my call, P1.5; D-21): a selected item has the selected
  tone (tone 3) and carries a block marker in accent, `--marker-width`
  (3 px) wide, on its leading edge. A selected tab carries it on its top
  edge and takes tone 2, so that it joins the page below it. The marker is
  part of selection: without it a selected item looks like a hovered one,
  and only the marker reaches 3:1. Hovered, a selected item goes to tone 4;
  focused, it takes raised focus; both keep the marker. A selected tab does
  not change when hovered, and takes well focus when focused. The focused
  tones follow the rule above: accent over the hovered tone.
- **Secondary text on a focused item**, and the chevron of a focused tree
  folder, is text, not dim text: dim text on raised focus measures 2.58:1 (see [accessibility](accessibility.md)).
- **Views** (my call, P1.5): a tree has no branch lines; it indents 20 px a
  level, and its chevron is dim text, turned when open. A table has no grid
  lines and no alternating rows. A header has no dividers: its sections are
  dim text at rest, text when sorted, and a sorted section carries a sort
  arrow.
- **Menus** (my call, P1.5): a menu item's keyboard highlight is its hovered
  tone, since Qt does not tell the two apart. A checked item carries a tick
  in accent in a 28 px column on its left, and a shortcut is dim text on the
  right. Menu separators are an 8 px gap: no line and no band of tone.
- **Tooltips** (my call, P1.5) are popups: they show 400 ms after their
  anchor is hovered or takes keyboard focus, and hide at once.
- **A dialog** is a window, with a title bar, window outline and window
  glow; no line sits above its buttons.
- **Ranges** (my call, P1.4): a fill is accent on a 6 px track below the
  surface; a disabled fill is dim text. A slider's thumb is 10 × 20 px.
  A progress bar has no text on it. A busy progress bar needs motion and
  is drawn in P3.5.
- **Thumbs.** The thumb of a slider and of a scrollbar take the same
  tones: lighter when hovered and lightest when pressed, as Breeze's do.
  (decided, D-65) At rest a thumb is tone 4, hovered `#585248`, pressed
  `#746e63` (my call, D-66; the owner looks at them in P1.7). A focused
  slider's thumb is the focused raised tone.
- **Scrollbars** (my call, P1.4): a 12 px thumb with no track fill and no
  arrow buttons.
  Every page of the prototype links `scrollbars.css`, so its own
  scrollbars are Amber's. A scroller that takes keyboard focus is tinted
  with the focused well's tone, and its thumb rises to dim text there: the
  thumb at rest would measure 1.09:1 on that tint.

Tokens of the widgets (my call, P1.3 to P1.5; the owner chooses O-1 and O-3 in
P1.7). Mixes are in sRGB; a mix is written in the token's comment, and the
token holds the plain colour (D-47).

| Token | Starting value | Used for |
|---|---|---|
| `--well` | `var(--tone-0)` | a well at rest (O-1) |
| `--well-edge` | `var(--well)` | the colour of the well edge (O-1) |
| `--well-edge-width` | `0px` | its height: none at the start (O-1) |
| `--raised-focus` | `#695c45`, accent 30 % over tone 4 | a focused raised widget (decided, D-64) |
| `--well-focus` | `#393226`, accent 16 % over tone 1 | a focused well (O-3; the owner finds it too light, and the gallery shows candidates that stay below the surface) |
| `--well-focus-edge` | `var(--accent)` | a bar at the foot of a focused well, a candidate cue (O-3) |
| `--well-focus-edge-width` | `0px` | its height: none at the start (O-3) |
| `--accent-hover` | `#debc7d`, accent at OKLCH lightness 81 % | a hovered or focused primary button |
| `--accent-pressed` | `#ba995b`, accent at OKLCH lightness 70 % | a pressed primary button |
| `--toggle` | `var(--tone-0)` | an unchecked toggle at rest (O-1) |
| `--toggle-focus` | `#524733`, accent 30 % over tone 1 | a focused unchecked toggle (decided, D-64) |
| `--track` | `var(--tone-0)` | the track of a slider or progress bar (O-1) |
| `--thumb` | `var(--tone-4)` | the thumb of a slider or a scrollbar at rest |
| `--thumb-hover` | `#585248` | a hovered thumb |
| `--thumb-pressed` | `#746e63` | a pressed thumb |
| `--selected` | `var(--tone-3)` | a selected item (P1.5) |
| `--marker-width` | `3px` | the block marker (P1.5; D-21) |

## Shadow

- **No glow and no shadow on a widget.** Union draws neither in Qt Widgets
  applications (see [platform](platform.md)), so the prototype uses neither.
  Wells and pressed widgets are shown by tone alone.
- A shadow under a popup, menu or inactive window is dark, soft and offset
  downwards. The active window has a window glow in its place; see "Window
  decoration".
  Whether Union draws one under menus and popups is unverified; see
  [platform](platform.md).
- A popup has the shadow of an inactive window: the same tokens, fade
  and insets. (decided, D-67) The popup's own rectangle and everything
  above its top edge are cut out of it, so it never darkens the popup or
  what it opens from. A tooltip is small, so its shadow is a third of the
  size (my call). A combo box's list meets its combo box with no gap. The
  gallery shows a "No shadow" candidate beside it, for the case that Union
  cannot draw it.

  | Token | Starting value | Used for |
  |---|---|---|
  | `--popup` | `var(--tone-3)` | a menu, a combo box list, a tooltip |

## Window decoration

- Title bar in tone 0; square corners.
- A window has a window outline. (decided, D-25) It runs along every edge,
  square at the corners, the same for active and inactive windows. It is
  one pixel wide and `#585248`, which reaches 2:1 against tones 0 to 2.
  (decided, D-62) A maximised window has none (my call).
- No other line: none between the title bar and the content.
- The active window has a window glow: a soft light in accent on every
  side, outside the window outline. An inactive window has a dark shadow
  in its place. (decided, D-26) A maximised window has neither.
  - The window glow is a faint indicator: accent at 14 % at the window
    outline, fading to nothing over 48 px, the same on every side. It has
    no contrast minimum. (decided, D-60)
  - The shadow is that of Breeze: black at 55 %, on a fade 36 px long
    that starts inside the window, so that 9 px of it show above the
    window, 19 px beside it and 32 px below it. (decided, D-59)
  - Both fade on one eased curve, taken from an Aurorae copy of Breeze's
    shadow: level for the first 6 % of the length, then falling fast and
    running out slowly. Its 13 stops are written in
    `prototype/window.css` (my call, D-61).
- Tokens of the decoration (decided, D-59, D-60 and D-62):

  | Token | Value | Used for |
  |---|---|---|
  | `--outline` | `#585248` | the window outline |
  | `--outline-width` | `1px` | its width |
  | `--glow` | accent at 14 % | the window glow, at the window outline |
  | `--glow-size` | `48px` | how far the window glow fades to nothing |
  | `--shadow` | black at 55 % | the shadow of an inactive window and of a popup, where its fade starts |
  | `--shadow-size` | `36px` | how long the shadow's fade is |
  | `--shadow-inset-top` | `27px` | how far inside the window the fade starts at the top |
  | `--shadow-inset-side` | `17px` | the same at the sides |
  | `--shadow-inset-bottom` | `4px` | the same at the foot |

- The prototype draws the window glow and the shadow as gradients from the
  window outline outwards, straight on the edges and round on the corners,
  as the Aurorae frame draws them (see [platform](platform.md), P0.6). It
  uses no `box-shadow`. Whether Aurorae draws the eased curve and a fade
  that starts inside the window is unverified until P5.3 (see
  [platform](platform.md)).
- Window buttons are flat and never glow, like every widget. Hovered minimise and maximise move up a tone; hovered close turns danger.
- An inactive window has dim title text.

## Terminal colours

Konsole's terminal colours: a background, a foreground and the 16 ANSI
colours. They are muted, warm-shifted hues that sit with the Sand palette
(D-20). Starting values (my call, P1.6; the owner chooses in P1.7):

| Token | Value | Built as |
|---|---|---|
| `--terminal` | `var(--tone-2)` | the window's main surface, so that the terminal matches its frame (D-56) |
| `--terminal-text` | `var(--text)` | Konsole's foreground |
| `--ansi-black` | `var(--tone-0)` | exempt from contrast (D-53) |
| `--ansi-red` | `#e39383` | OKLCH 74 % 0.10 32: shifted towards orange |
| `--ansi-green` | `#9eb576` | OKLCH 74 % 0.09 125: shifted towards olive |
| `--ansi-yellow` | `var(--accent)` | the accent is already a muted gold (D-57) |
| `--ansi-blue` | `#7fb2d1` | OKLCH 74 % 0.07 235 |
| `--ansi-magenta` | `#d296b2` | OKLCH 74 % 0.08 350 |
| `--ansi-cyan` | `#82bbb3` | OKLCH 75 % 0.06 185 |
| `--ansi-white` | `var(--text)` | |
| `--ansi-bright-black` | `var(--text-dim)` | dim output and suggestions; it carries text, so it is not exempt |
| `--ansi-bright-red` … `--ansi-bright-cyan` | `#f9afa0`, `#b7cf8e`, `#e6ca91`, `#9fcbe6`, `#e8b2ca`, `#a3d2cb` | the same hues at OKLCH 82–85 %, chroma 0.05–0.09 |
| `--ansi-bright-white` | `#f5f1ea` | OKLCH 96 % 0.01 82 |

- **A hue is not a grey.** "No cool grey" is about neutrals. Blue and cyan
  are hues with a chroma of at least 0.05; every neutral of the terminal is
  a warm tone or text token.
- The normal colours are light enough to carry text on the terminal, so
  light text on them as a background does not reach 4.5:1: open question
  O-5 in the [decisions](decisions.md).
- Konsole's intense and faint variants of the foreground and background,
  and the cursor (a profile setting), are settled in P4.1.
- The prototype shows the terminal on `prototype/samples.html`, with the
  terminal background's candidates.

## Editor theme

Kate's editor area. Starting values (my call, P1.6):

| Token | Value | Used for |
|---|---|---|
| `--editor` | `var(--tone-2)` | the editor background, as the terminal's (D-56) |
| `--editor-gutter` | `var(--tone-1)` | the gutter, a tone below the code, as a sidebar is |
| `--editor-current-line` | `var(--tone-3)` | the current line, a tone above the code |
| `--editor-selection` | `#3d362b` | the text selection: accent 14 % over tone 2 (D-58) |
| `--syntax-keyword` | `var(--ansi-magenta)` | keywords |
| `--syntax-function` | `var(--ansi-blue)` | function names |
| `--syntax-type` | `var(--ansi-cyan)` | type names |
| `--syntax-string` | `var(--ansi-green)` | strings and characters |
| `--syntax-number` | `var(--ansi-red)` | numbers and constants |
| `--syntax-preprocessor` | `var(--ansi-yellow)` | `#include` and imports |
| `--syntax-comment` | `var(--ansi-bright-black)` | comments |

- **The syntax colours are the ANSI colours** (D-57), so Kate and Konsole
  share one palette and a hue changed once changes both. Plain code is
  text. Line numbers are dim text; the current line's number is text.
- **No line.** The gutter is told from the code by tone alone. Kate can
  draw indentation lines and a word wrap marker; those are hairlines, and
  P4.2 finds out whether the editor theme can leave them out. How
  KSyntaxHighlighting's text styles and its other editor colours (search
  highlight, bracket matching, spelling, markers) map onto these tokens is
  settled in P4.2.
- The text selection and the current line are close in lightness (1.13:1)
  and are told apart by the accent's hue. More accent makes comments fail
  4.5:1 on the selection (see [accessibility](accessibility.md), rule 3).
- The prototype shows the editor on `prototype/samples.html`, with the text
  selection's candidates.

## What must not appear

A rounded corner, a hairline, or a cool grey. A round widget is not a
rounded corner, and the window outline is the one hairline allowed. See the anti-goals in the
[vision](../product/vision.md).
