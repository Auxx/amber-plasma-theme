# Amber — Design language

> Status: **Accepted** on 2026-11-11

The look of Amber, as rules. The values here are the starting point taken from
the Sand mockup the owner chose; they are tuned in the prototype, and the
tokens file is the source once it exists. When this document and the tokens
file disagree about a value, the tokens file is right and this document is
updated.

## Principles

1. **Warm.** Every neutral leans warm. No cool grey. (decided)
2. **Square.** Every corner radius is zero. (decided)
3. **No lines.** No border, outline, separator or divider one pixel wide.
   Surfaces and widgets are told apart by tone. (decided)
4. **State is light.** Hovered and focused widgets glow softly. (decided)
5. **Quiet at rest.** A window full of widgets at rest shows no glow at all.
   (my call)

## Starting tokens (my call)

| Token | Value | Used for |
|---|---|---|
| tone 0 | `#151413` | title bar, wells, tracks of sliders and progress bars |
| tone 1 | `#1c1a18` | sidebars, secondary panels |
| tone 2 | `#25221f` | the main surface of a window |
| tone 3 | `#312e29` | raised widgets: buttons, selected items |
| tone 4 | `#3c3832` | hovered raised widgets |
| text | `#e8e3da` | primary text and icons |
| dim text | `#9c958a` | secondary text, placeholders, inactive titles |
| accent | `#d1b072` | selection, checked, progress, primary button, glow |
| on-accent | `#1b160b` | text on accent |
| danger | `#b5442f` | close button when hovered, negative states |
| on-danger | `#fbf3e6` | text and icons on danger; the text token is too dark for it |

Token names, further tones and the terminal and syntax colours are settled in
plan P1.1 and P1.6. Terminal and syntax colours are muted, warm-shifted hues
that sit with the Sand palette; the owner approves them in the prototype
before they go into real files.

## Surfaces

- A window is built from tones 0 to 2: title bar darkest, sidebars next, the
  main surface lightest.
- Two surfaces that touch differ by at least one tone.
- Menus, popups and tooltips are one tone away from what they cover and carry
  a shadow. They have no outline.

## Widgets

| Widget kind | At rest | Hovered | Focused | Pressed | Disabled |
|---|---|---|---|---|---|
| Raised (button, tool button, combo box) | tone 3 | tone 4 and a faint glow | stronger glow | a darker tone, no glow | dim text, lowered opacity, no glow |
| Well (text field, spin box) | tone 0 | faint glow | stronger glow | — | dim text, lowered opacity |
| Toggle (check box, radio button) | tone 0 box | glow on the box | stronger glow on the box | — | lowered opacity |
| Primary button | accent fill, on-accent text | stronger accent glow | stronger accent glow | darker accent | lowered opacity |
| Close button | as title bar | danger fill and danger glow | — | darker danger | — |

- A checked toggle fills with accent and carries a faint glow.
- A selected list or sidebar item has a tone 3 background. It may carry a
  block marker in accent on its leading edge.
- Progress and slider fills are accent on a tone 0 track.

## Glow and shadow

- A glow is one outer, blurred shadow in the accent colour with no offset.
  Starting amounts (my call): hovered about 12–14 px blur at 20–28 % alpha;
  focused about 18 px blur at 45 % alpha.
- A glow must never read as a line. If it does at any size, it is too tight
  or too strong.
- **One shadow per widget, and no inner shadows.** Union CSS allows a single
  outer shadow and has no `inset` (see [platform](platform.md)). So wells and
  pressed widgets are shown by tone alone, and focus is a single stronger
  glow, not a halo plus a glow. The prototype keeps to the same limit so that
  it shows only what the system can draw.
- A shadow under a popup, menu or window is dark, soft and offset downwards.

## Window decoration

- Title bar in tone 0; square corners; no border line on any edge.
- A soft drop shadow around the window.
- Window buttons are flat. Hovered minimise and maximise move up a tone and
  glow; hovered close turns danger.
- An inactive window has dim title text.

## What must not appear

A rounded corner, a hairline, or a cool grey. See the anti-goals in the
[vision](../product/vision.md).
