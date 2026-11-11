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
  The status area is tone 1, like the sidebars. (my call; tuned in plan P1.2)
- Two surfaces that touch differ by at least one tone, unless they are meant
  to read as one area, as the header is.
- Menus, popups and tooltips are one tone away from what they cover and carry
  a shadow. They have no outline.

## Widgets

| Widget kind | At rest | Hovered | Focused | Pressed | Disabled |
|---|---|---|---|---|---|
| Raised (button, tool button, combo box) | tone 3 | tone 4 | tone 4 tinted with accent | a darker tone | dim text |
| Well (text field, spin box, text area) | tone 0 | tone 1 | tone 1 tinted with accent | — | dim text |
| Toggle (check box, radio button) | tone 0 box, or tone 0 circle for a radio button | a lighter box | a box tinted with accent | — | dim text |
| Primary button | accent fill, on-accent text | lighter accent | settled in the prototype | darker accent | dim text |
| Close button | as title bar | danger fill | — | darker danger | — |

- The states above are the starting point (my call), taken from the sample
  the owner saw in spike P0.5. That sample was not held to the contrast
  rules. The exact tones of every state are worked out in step 1, the
  prototype; how strong the focused tone must be is open question O-3 in
  the [decisions](decisions.md).
- A checked toggle fills with accent.
- A selected list or sidebar item has a tone 3 background. It may carry a
  block marker in accent on its leading edge.
- Progress and slider fills are accent on a tone 0 track.

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
- Window buttons are flat and never glow, like every widget. Hovered minimise and maximise move up a tone; hovered close turns danger.
- An inactive window has dim title text.

## What must not appear

A rounded corner, a hairline, or a cool grey. A round widget is not a
rounded corner, and the window outline is the one hairline allowed. See the anti-goals in the
[vision](../product/vision.md).
