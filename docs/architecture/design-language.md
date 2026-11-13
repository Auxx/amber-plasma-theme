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

## Tokens

| Token | Name | Value | Used for |
|---|---|---|---|
| tone 0 | `--tone-0` | `#151413` | title bar, wells, tracks of sliders and progress bars |
| tone 1 | `--tone-1` | `#1c1a18` | sidebars, secondary panels |
| tone 2 | `--tone-2` | `#25221f` | the main surface of a window |
| tone 3 | `--tone-3` | `#312e29` | raised widgets: buttons; hovered items |
| tone 4 | `--tone-4` | `#3c3832` | hovered raised widgets, selected items, thumbs at rest |
| text | `--text` | `#e8e3da` | primary text and icons |
| dim text | `--text-dim` | `#a9a297` | secondary text, placeholders, inactive titles. Lightened from `#9c958a` in P1.1 to reach 4.5:1 on tone 4 (my call) |
| accent | `--accent` | `#d1b072` | selection, checked, progress, primary button, the tint of a focused widget |
| on-accent | `--on-accent` | `#1b160b` | text on accent |
| danger | `--danger` | `#b5442f` | close button when hovered, negative states |
| on-danger | `--on-danger` | `#fbf3e6` | text and icons on danger; the text token is too dark for it |
| link | `--link` | `var(--syntax-function)`, `#7fb2d1` | a link, in the colour scheme (D-87) |
| visited | `--visited` | `var(--syntax-keyword)`, `#d79bb7` | a visited link, in the colour scheme (D-87) |
| positive | `--positive` | `var(--syntax-string)`, `#9eb576` | positive text, a status colour (D-87) |
| neutral | `--neutral` | `var(--accent)`, `#d1b072` | neutral text, a status colour (D-87) |
| negative | `--negative` | `var(--syntax-number)`, `#e89887` | negative text, a status colour; danger is a fill and too dark for text (D-87) |

The values live in [`prototype/tokens.css`](../../prototype/tokens.css); when
this table and that file disagree, the file is right. Token names are written
without a prefix (my call, D-43). The tones of widgets are in "Widgets"
below; the terminal and syntax colours are in "Terminal colours" and
"Editor theme". The designer chose the tones, the text colours and the
accent; the owner approved them, and the whole prototype, on 2026-11-12
(D-85).

## Surfaces

- A window is built from tones 0 to 2: title bar darkest, sidebars next, the
  main surface lightest.
- The menu bar and toolbar continue the title bar in tone 0, as one header.
  The status area is tone 1, like the sidebars. (my call; seen in the window
  shell of plan P1.2)
- Only a header toolbar, one at the top of a main window, is tone 0. A
  toolbar at the foot of a window, or outside a main window, has no fill and
  takes the tone of its surface. A toolbar's separator is a gap, with no
  line. (my call, D-108)
- Two surfaces that touch differ by at least one tone, unless they are meant
  to read as one area, as the header is.
- A splitter between two panes is a clear gap that shows the window's tone,
  wide enough not to be a line. A line frame between groups of a dialog is a
  gap, and a group box has no frame and no fill of its own. (my call, D-116)
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
| Text field, spin box, text area | well / text | well hover / text | well focus / text, accent bar | — | — | well / dim text |
| Close button | as title bar | danger fill | — | darker danger | — | — |

Toggles and ranges (my call, P1.4). Each cell gives the box / mark, the
thumb / fill, or the track / fill. A toggle's checked states are its own row.

| Widget | At rest | Hovered | Focused | Pressed | Disabled |
|---|---|---|---|---|---|
| Check box, radio button, unchecked | toggle / no mark | well hover | toggle focus | — | toggle |
| Check box, radio button, checked | accent / on-accent | accent hover / on-accent | accent hover / on-accent | — | toggle / dim text |
| Slider | thumb / accent fill | thumb hover / accent | raised focus / accent | thumb pressed / accent | tone 3 / dim text |
| Progress bar | track / accent fill | — | — | — | track / dim text |
| Scrollbar thumb | thumb | thumb hover | — | thumb pressed | tone 3 (my call, D-108) |

Navigation, views and popups (my call, P1.5). Each cell gives the
background / text, and the block marker or tick where the widget has one.

| Widget | At rest | Hovered | Focused | Pressed | Selected, checked or sorted | Disabled |
|---|---|---|---|---|---|---|
| Tab, on a tone 0 tab bar | no fill / text | tone 1 / text | surface focus / text | — | selected: tone 2 / text, marker | no fill / dim text |
| Tab's close button (my call, D-108) | no fill / dim text | danger / on danger | — | danger / on danger | — | — |
| Item (list, tree, table, sidebar) | no fill / text | tone 3 / text | raised focus / text | as hovered (my call, D-112) | selected: selected / text, no marker (decided, D-111) | no fill / dim text; selected: selected / dim text (my call, D-112) |
| Header section | no fill / dim text | tone 3 / text | — | tone 1 / text | sorted: no fill / text, sort arrow | no fill / dim text (my call, D-112) |
| Menu title, on a tone 0 menu bar (my call, D-108) | no fill / text | tone 3 / text | tone 3 / text | — | open: popup / text | no fill / dim text |
| Menu item, in a popup | no fill / text | tone 4 / text | tone 4 / text | as hovered (my call, D-114) | checked: no fill / text, accent tick; exclusive: accent dot (my call, D-114) | no fill / dim text; checked: dim tick (my call, D-114) |

- **Precedence:** pressed wins over focused, and focused over hovered. A
  disabled widget never changes. (my call)
- **Pressed sinks.** A pressed button goes to tone 1, below the tone 2
  surface; a pressed tool button goes to tone 2, one below its hovered tone.
  (my call)
- **A checked tool button** keeps its accent text in every state. Hovered,
  it goes to tone 4, one above its checked tone; focused and pressed, it
  takes the tones of an unchecked tool button. (my call)
- **The primary button** shows focus with its hovered tone: it is already
  accent, so it has no focused tone of its own. (decided, D-76) The Union style cannot draw it in
  applications built with Qt Widgets, and the same rule serves Qt Quick, so
  it is drawn as any other button there too: a known gap. (decided, D-100)
- **Wells:** a placeholder is dim text; selected text is text on the
  text selection, `--text-selection`, a dark gold (decided, D-110).
  The colour scheme's Selection is the same colour, so that text an
  application selects or paints itself keeps its colour; Breeze's folder
  icons take it too. A spin box's step buttons take no keyboard focus; the well around
  the field shows it.
- **The focused tone** of a raised widget, a toggle, a tab or a scroll
  area is accent mixed over the tone the widget has when hovered: 30 %
  for a raised widget and a toggle. (decided, D-64)
- **A hovered well** takes `well hover`, a faint tint of accent over
  tone 0, so that it stands apart from a dialog's tone 1 body and from a
  tone 2 view. (decided, D-102)
- **A focused well** is not tinted, so that it does not look raised. It
  takes tone 1 and gains a bar of accent three pixels high at its foot.
  (decided, D-69) A spin box's step buttons stay clear of the bar. A well
  shows focus whenever it has the text cursor, clicked or tabbed, as a
  browser does. (decided, D-103)
- **Wells in Qt Widgets applications** have three known gaps: a text
  area's inside stays tone 2, a spin box's steps are drawn in text with no
  hovered tone, and disabled text and placeholders take the colour
  scheme's disabled colours, not dim text. (decided, D-104; see
  [platform](platform.md#union))
- **An empty well** is told from its surface by tone alone: tone 0 on
  tone 2, with no bar at its foot. (decided, D-75)
- **Toggles** (my call, P1.4): a 16 px box, or a circle for a radio
  button, which is a round widget. Unchecked, it sits below the surface
  like a well; checked, it fills with accent and carries an on-accent mark:
  a tick with square ends, or a dot. A toggle has no pressed tone: held
  down, it stays hovered. Hovering its label hovers the box. Its label is
  dim text when it is disabled, and a disabled checked toggle keeps its
  mark in dim text. A checked toggle shows focus with its hovered tone, as
  the primary button does. (decided, D-76) A partly checked check box is
  drawn as a checked one, with an on-accent bar 8 × 2 px in the centre in
  place of the tick. (my call, D-105)
- **A hovered unchecked toggle** takes `well hover`, as a hovered well
  does: tone 1 is a dialog's body, where the box vanished. (decided,
  D-106)
- **An unchecked toggle** and **an empty track** are told from their
  surface by tone alone, as an empty well is. (decided, D-75)
- **Selection**: a selected item has the selected tone, tone 4 (decided,
  D-72), one tone above a hovered item. Its text keeps its colour in every
  state, as in Breeze (decided, D-110). It carries no block marker, in a
  view or a sidebar, and is told by its tone alone (decided, D-111). A
  selected tab carries a block marker in accent, `--marker-width` (3 px)
  wide (D-21), on its outer
  edge, the one away from its page: the top of a tab bar above its pages, the
  bottom of one below them, the left or right of one beside them (my call,
  D-108). It takes tone 2, so that it joins the page. In Qt Widgets
  applications Union draws no tab bar, so a tab at rest paints tone 0
  itself, and past the last tab the bar shows the window's tone (decided,
  D-109). A tab's marker is part of its selection: only the marker reaches
  3:1. Hovered, a selected item keeps tone 4 and does not change (my call,
  D-73); focused, it takes raised focus. A disabled selected item keeps tone 4 with dim text (my call,
  D-112). A selected tab does
  not change when hovered, and takes surface focus when focused. The focused
  tones follow the rule above: accent over the hovered tone.
- **Secondary text on a focused item**, and the chevron of a focused tree
  folder, is text, not dim text: dim text on raised focus measures 2.58:1 (see [accessibility](accessibility.md)).
- **Views** (my call, P1.5): a tree has no branch lines; it indents 20 px a
  level, and its chevron is dim text, turned when open. A table has no grid
  lines and no alternating rows. A header has no dividers: its sections are
  dim text at rest, text when sorted, and a sorted section carries a sort
  arrow.
- **Focus in a view** (my call, D-112): an item shows its focused tone only
  under keyboard focus, as the prototype's `:focus-visible` does: a view
  that has focus always has a current item, and Dolphin's view nearly
  always has focus. A view itself takes no focused tint in Qt Widgets
  applications. A pressed item is drawn as hovered. In Qt Widgets
  applications a header section paints the view's tone 2 itself (my call,
  D-112). Known gaps there: an item's text starts at its edge, a table or
  tree tints one cell rather than the row, a tree's indentation is never
  filled, and a view's own background, such as a settings page list's,
  and a header past its last section keep the colour scheme's tones
  (decided, D-113; see [platform](platform.md#union)).
- **The rubber band**, dragged over a view to select items, is the selected
  tone at half strength, `--rubber-band`, with no border (decided, D-110).
- **Menus** (my call, P1.5): a menu item's keyboard highlight is its hovered
  tone, since Qt does not tell the two apart. A checked item carries a tick
  in accent in a 28 px column on its left, and a shortcut is dim text on the
  right. Menu separators are an 8 px gap: no line and no band of tone.
  A menu section's title is dim text at the item's weight, where an item's
  label starts, with no line; an item whose submenu is open keeps its
  hovered tone; a combo box's list is a menu with no tick column and no
  padding above or below, its current value in the hovered tone, as Qt
  draws it (my call, D-114); its text lines up with its combo box's, as
  Breeze's does (decided, D-115). In Qt Widgets a submenu arrow is text,
  not dim text: the Union style cannot colour it apart from the item's
  icon (my call, D-114).
- **Tooltips** (my call, P1.5) are popups: they show 400 ms after their
  anchor is hovered or takes keyboard focus, and hide at once.
- **A dialog** is a window, with a title bar, window outline and window
  glow; no line sits above its buttons. Its body is tone 1. A Qt Quick
  dialog, drawn inside its window, has the same body and a popup's shadow
  (my call, D-114).
- **Ranges** (my call, P1.4): a fill is accent on a 6 px track below the
  surface; a disabled fill is dim text. A slider's thumb is 10 × 20 px.
  A progress bar has no text on it.
- **A busy progress bar** moves a block of accent 32 px long along its
  track, left to right, over 1.5 s; when the reader asks for less motion,
  it stands still at the start of the track. The gallery shows it still,
  as it shows every state. (my call, D-105)
- **Tick marks** of a slider are `--marker-width` (3 px) wide and 6 px
  long, under the track, one at each step: dim text, and tone 3 when the
  slider is disabled. They have no accent: only the fill has. (my call,
  D-105)
- **Thumbs.** The thumb of a slider and of a scrollbar take the same
  tones: lighter when hovered and lightest when pressed, as Breeze's do.
  (decided, D-65) At rest a thumb is tone 4, hovered `#585248`, pressed
  `#746e63` (D-66; approved by the owner, D-71). A focused
  slider's thumb is the focused raised tone.
- **Scrollbars** (my call, P1.4): a 12 px thumb with no track fill and no
  arrow buttons. In Qt Widgets applications the clear track shows the
  window's tone, not the view's, and the thumb lightens whenever the
  pointer is over the bar (decided, D-109).
  Every page of the prototype links `scrollbars.css`, so its own
  scrollbars are Amber's. A scroller that takes keyboard focus is tinted
  with the focused tab's tone, and its thumb rises to dim text there: the
  thumb at rest would measure 1.09:1 on that tint.

Tokens of the widgets (P1.3 to P1.5; reviewed by the owner in P1.7). Mixes are in sRGB; a mix is written in the token's comment, and the
token holds the plain colour (D-47).

| Token | Value | Used for |
|---|---|---|
| `--well` | `var(--tone-0)` | a well at rest (decided, D-75) |
| `--well-hover` | `#2f2a20`, accent 14 % over tone 0 | a hovered well (decided, D-102) |
| `--raised-focus` | `#695c45`, accent 30 % over tone 4 | a focused raised widget (decided, D-64) |
| `--well-focus` | `var(--tone-1)` | a focused well (decided, D-69) |
| `--surface-focus` | `#393226`, accent 16 % over tone 1 | a focused tab or scroll area (my call, D-68) |
| `--well-focus-edge` | `var(--accent)` | the bar at the foot of a focused well (decided, D-69) |
| `--well-focus-edge-width` | `3px` | its height (decided, D-69) |
| `--accent-hover` | `#debc7d`, accent at OKLCH lightness 81 % | a hovered or focused primary button |
| `--accent-pressed` | `#ba995b`, accent at OKLCH lightness 70 % | a pressed primary button |
| `--toggle` | `var(--tone-0)` | an unchecked toggle at rest (decided, D-75) |
| `--toggle-focus` | `#524733`, accent 30 % over tone 1 | a focused unchecked toggle (decided, D-64) |
| `--track` | `var(--tone-0)` | the track of a slider or progress bar (decided, D-75) |
| `--thumb` | `var(--tone-4)` | the thumb of a slider or a scrollbar at rest |
| `--thumb-hover` | `#585248` | a hovered thumb |
| `--thumb-pressed` | `#746e63` | a pressed thumb |
| `--selected` | `var(--tone-4)` | a selected item (decided, D-72) |
| `--marker-width` | `3px` | the block marker of a selected tab (P1.5; D-21) |
| `--text-selection` | `#605239`, accent 40 % over tone 0 | selected text in a field, and the colour scheme's Selection, which folder icons take (decided, D-110) |
| `--rubber-band` | the selected tone at 50 % | the rubber band (decided, D-110) |

## Shadow

- **No glow and no shadow on a widget.** Union draws neither in Qt Widgets
  applications (see [platform](platform.md)), so the prototype uses neither.
  Wells and pressed widgets are shown by tone alone.
- A shadow under a popup, menu or inactive window is dark, soft and offset
  downwards. The active window has a window glow in its place; see "Window
  decoration".
  Union draws none under a popup in a Qt Widgets application, only in
  Qt Quick (see [platform](platform.md#union)).
- A popup has the shadow of an inactive window: the same tokens, fade
  and insets. (decided, D-67) The popup's own rectangle and everything
  above its top edge are cut out of it, so it never darkens the popup or
  what it opens from. A tooltip is small, so its shadow is a third of the
  size (my call). A combo box's list meets its combo box with no gap. Union
  cannot draw it in Qt Widgets, so a popup has no shadow there: the owner
  accepts that. (decided, D-74) In Qt Quick the Union style draws it as one
  shadow, `0px 12px 20px 0px` in `--shadow` (my call, D-114).

  | Token | Value | Used for |
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
  | `--title-bar-height` | `30px` | the title bar's height, below the window outline (my call, P5.1) |
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
(D-20). The six normal colours are the owner's choice (decided, D-80).

| Token | Value | Built as |
|---|---|---|
| `--terminal` | `var(--tone-1)` | the terminal background, a tone below the window's main surface (decided, D-78) |
| `--terminal-text` | `var(--text)` | Konsole's foreground |
| `--ansi-black` | `var(--tone-0)` | exempt from contrast (D-53) |
| `--ansi-red` | `#aa5f51` | OKLCH 57 % 0.10 32: shifted towards orange |
| `--ansi-green` | `#667b3e` | OKLCH 55 % 0.09 125: shifted towards olive |
| `--ansi-yellow` | `#8d7030` | OKLCH 56 % 0.09 85: a darker gold than the accent |
| `--ansi-blue` | `#487a97` | OKLCH 56 % 0.07 235 |
| `--ansi-magenta` | `#9b647e` | OKLCH 57 % 0.08 350 |
| `--ansi-cyan` | `#1b8278` | OKLCH 55 % 0.09 185: more chroma than the others, so that it stands apart from blue (decided, D-119) |
| `--ansi-white` | `#bbb7af` | light grey, OKLCH 78 % 0.012 80 (decided, D-119) |
| `--ansi-bright-black` | `#6d6861` | dark grey, OKLCH 52 % 0.012 80: dim output and suggestions; it carries text, so it is not exempt (decided, D-119) |
| `--ansi-bright-red` … `--ansi-bright-cyan` | `#ffc4b8`, `#c7df9e`, `#f7dba1`, `#afdbf7`, `#f9c2db`, `#8febdf` | the same hues at OKLCH 87–90 %, chroma 0.06–0.09; red at 0.07 to stay in sRGB (decided, D-119) |
| `--ansi-bright-white` | `#f5f1ea` | OKLCH 96 % 0.01 82 |

- **A hue is not a grey.** "No cool grey" is about neutrals. Blue and cyan
  are hues with a chroma of at least 0.05; every neutral of the terminal is
  a warm tone or text token.
- **A normal colour has two jobs:** text on the terminal, and a background
  under light text, as in Midnight Commander's panels and in status
  badges. So the normal colours sit at lightness 55–57 % (decided, D-80),
  well apart from the bright ones at 87–90 % (decided, D-119). No colour
  does both jobs at 4.5:1 on tone 1; these do each at about 3.7:1. See
  rule 3 of [accessibility](accessibility.md).
- **The greys are four steps** (decided, D-119): black (tone 0), dark grey
  (bright black, 52 %), light grey (white, 78 %) and white (bright white,
  96 %). The terminal's foreground stays `text`, lighter than ANSI white.
- **Konsole's faint and intense variants** take tokens too (my call,
  D-118): a faint colour is its normal colour, and faint white and the faint
  foreground are `text-dim`; an intense colour is its bright colour, and the
  intense foreground, which Konsole uses for bold text, is bright white. The
  background keeps `terminal` in all three. The table is
  `parts/terminal-colours/keys.json`. The cursor is a profile setting,
  outside the terminal colours: Konsole draws it in the foreground.
- The prototype shows the terminal on `prototype/samples.html`, with
  status badges and a Midnight Commander panel on coloured backgrounds.

## Editor theme

Kate's editor area, reviewed by the owner in P1.7 (D-82):

| Token | Value | Used for |
|---|---|---|
| `--editor` | `var(--tone-2)` | the editor background, the window's main surface (D-56) |
| `--editor-gutter` | `var(--tone-1)` | the gutter, a tone below the code, as a sidebar is |
| `--editor-current-line` | `var(--tone-3)` | the current line, a tone above the code |
| `--editor-selection` | `#473e30` | the text selection: accent 20 % over tone 2 (decided, D-82) |
| `--editor-search` | `#2e3b16` | the search highlight: OKLCH 33 % 0.06 125, a dark olive between the current line and the text selection (decided, D-122) |
| `--syntax-keyword` | `#d79bb7` | keywords; OKLCH 75.5 % 0.08 350 |
| `--syntax-function` | `#7fb2d1` | function names; OKLCH 74 % 0.07 235 |
| `--syntax-type` | `#82bbb3` | type names; OKLCH 75 % 0.06 185 |
| `--syntax-string` | `#9eb576` | strings and characters; OKLCH 74 % 0.09 125 |
| `--syntax-number` | `#e89887` | numbers and constants; OKLCH 75.5 % 0.10 32 |
| `--syntax-preprocessor` | `var(--accent)` | `#include` and imports |
| `--syntax-comment` | `var(--text-dim)` | comments |

- **The syntax colours are the editor's own**, separate from the terminal
  colours. (decided, D-79) The editor has a fixed background, changed only
  by the current line, the text selection and the search highlight, so its colours are tuned
  as text alone; a terminal colour must also serve as a background. They
  share the terminal's hues, at a lightness of 74 to 76 %. Plain code is text. Line numbers are dim text; the current line's number is text.
- **No line.** The gutter is told from the code by tone alone. The line
  Kate draws between them takes the gutter's tone, and its indentation
  lines and word wrap marker take the code's, so none of them shows, except
  across the current line, where a seam 1 px wide is a known gap (decided,
  D-124).
- **Text styles and editor colours** each take a token from
  `parts/editor-theme/styles.json` (D-121): no style is bold or italic; a
  match of a search is the search highlight, a matched bracket tone 4, and
  the gutter's marks are syntax colours (breakpoints and errors the number
  colour, modified lines and warnings the preprocessor colour, saved lines
  the string colour).
- The text selection stands apart from the current line (1.29:1) so that
  the two are not mistaken for each other. (decided, D-82) Every syntax
  colour but the comment keeps 4.5:1 on it; a comment inside a selection
  measures 4.15:1, which the owner accepts. Keywords and numbers are a
  little lighter than the other hues so that they pass there (D-83).
- The editor stays on tone 2 while the terminal is tone 1: the step to
  the gutter tells the code from it. (decided, D-82)
- The prototype shows the editor on `prototype/samples.html`, as Kate's C++
  highlighting draws it (decided, D-123; its `std::min` line is my call).

## What must not appear

A rounded corner, a hairline, or a cool grey. A round widget is not a
rounded corner, and the window outline is the one hairline allowed. See the anti-goals in the
[vision](../product/vision.md).
