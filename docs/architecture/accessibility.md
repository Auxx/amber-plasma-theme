# Amber — Accessibility: contrast

> Status: **Accepted** on 2026-11-11. Three questions are deferred to
> the prototype: O-1, O-3 and O-4 in the [decisions](decisions.md).

Amber checks its colours against the contrast rules of WCAG 2.2, level AA.
WCAG is written for web content, but its contrast measure works for any pair
of colours, so it can be used for a desktop theme as it stands.

## What WCAG asks

| Criterion | Asks for | Applies in Amber to |
|---|---|---|
| 1.4.3 Contrast (Minimum) | 4.5:1 for text; 3:1 for large text | all text and icons on every surface they appear on |
| 1.4.11 Non-text Contrast | 3:1 for the features of a control needed to identify it and its state, against what is next to them | check marks, block markers, slider and progress fills, the tone of a focused widget |
| 2.4.7 Focus Visible | the focused control can be seen | the tone of the focused widget |

Disabled controls are exempt in WCAG, and are exempt here.

## Amber's rules (my call)

1. **Text: 4.5:1.** Primary text and dim text reach 4.5:1 on every tone they
   can appear on; on-accent reaches it on accent, and on-danger on danger. The lower 3:1 for large text
   is not used.
2. **Indicators: 3:1.** Accent reaches 3:1 against every tone it marks: the
   check mark's fill against the surface, a block marker against its item, a
   fill against its track.
3. **Syntax and terminal colours: 4.5:1** against the editor and terminal
   background. ANSI black is exempt, since it is meant to match a dark
   background.
4. **Focused widgets: open.** A focused widget is shown by a tone tinted
   with accent. How far that tone must stand from the widget at rest and
   from the surface is open question O-3 in the [decisions](decisions.md).
   Text on the focused tone reaches 4.5:1 like any other text, and so does
   the placeholder of a focused well. Until O-3 is closed, the pairs of
   `raised-focus` and `well-focus` against the widget at rest and the
   surface have a provisional minimum of 1.2 (my call): a floor, not a WCAG
   rule. A placeholder in dim text passes 4.5:1 on a focused well tinted up to
   20 %, but close at 20 % (4.57:1), and fails beyond it (3.60:1 at 30 %),
   which caps the tint of a focused well near 20 %.
5. **Window outline: open.** The window outline tells one window from the
   window or desktop behind it. What contrast it must reach is open
   question O-4 in the [decisions](decisions.md); its contrast pairs are
   declared with its token. The window glow marks the active window; it
   is settled in the same question, and the dim title text of an inactive
   window marks the same state. Until O-4 is closed, the pairs of
   `outline` and `glow` on tones 0 to 2 have a provisional minimum of 1.3
   (my call): a floor that keeps them from fading, not a WCAG rule. The
   shadow shows no state and has no pair. On the active window the
   outline also meets its own glow, against which it measures less (1.14:1
   over tone 0); whether that is measured is part of O-4.
6. **A pair that passes by less than 2 % is close** and is reported as a
   warning.

## Where Amber departs from WCAG on purpose

Tonal separation is the heart of Amber, and the steps between tones are small
by design, from 1.06:1 to about 1.2:1. That is far below 3:1.

- **Between surfaces this is fine.** WCAG does not ask for a visible edge
  between a sidebar and a content area.
- **For a button it is fine too.** Its label identifies it, and the label is
  checked as text.
- **For a control that is identified only by its shape it is a departure.**
  An empty text field, an unchecked check box or radio button, and an empty
  slider track are told from their surface by tone alone, so they do not
  reach the 3:1 of criterion 1.4.11.

Reaching 3:1 there would need an edge or a much lighter fill, which is the
opposite of what Amber is for.

### Open question (the owner's)

How should Amber treat controls identified only by tone?

- Accept the departure and record it as a known gap; or
- give only those controls a stronger cue that is not a hairline, such as a
  clearly lighter box for an unchecked check box.

The owner deferred this on 2026-11-11 to the prototype, where the tones can
be seen. The gallery plans P1.3 and P1.4 show these controls with candidate
tones and their measured ratios side by side, and the owner chooses in P1.7.
Since P1.3 the empty well's candidates are on `prototype/gallery.html`.

- **A darker well cannot get there.** Even black measures only 1.33:1 on
  tone 2 (measured 2026-11-11), so a stronger cue must be lighter than the
  surface, or a well edge.
- Until O-1 is closed, the pairs of `well` and `well-edge` on tone 2 have a
  provisional minimum of 1.1 (my call). At the start the well edge has no
  width and the well's own tone.

## First measurements

Measured on 2026-11-11 on the tokens of plans P1.1, P1.2 and P1.3. `node tools/src/bin/tokens.mjs
pairs` gives the current ratios of every pair, and the tests fail when one
falls below its minimum.

| Foreground | Background | Ratio | Rule | Result |
|---|---|---|---|---|
| text | tone 0 | 14.40:1 | 4.5 | pass |
| text | tone 1 | 13.58:1 | 4.5 | pass |
| text | tone 2 | 12.38:1 | 4.5 | pass |
| text | tone 3 | 10.58:1 | 4.5 | pass |
| text | tone 4 | 9.11:1 | 4.5 | pass |
| dim text | tone 0 | 7.27:1 | 4.5 | pass |
| dim text | tone 1 | 6.86:1 | 4.5 | pass |
| dim text | tone 2 | 6.25:1 | 4.5 | pass |
| dim text | tone 3 | 5.34:1 | 4.5 | pass |
| dim text | tone 4 | 4.60:1 | 4.5 | pass |
| on-accent | accent | 8.72:1 | 4.5 | pass |
| accent | tone 0 | 8.91:1 | 3 | pass |
| accent | tone 1 | 8.40:1 | 3 | pass |
| accent | tone 2 | 7.66:1 | 3 | pass |
| accent | tone 3 | 6.54:1 | 3 | pass |
| accent | tone 4 | 5.63:1 | 3 | pass |
| on-danger | danger | 4.97:1 | 4.5 | pass |
| window outline | tone 0 | 1.58:1 | 1.3 (provisional) | pass |
| window outline | tone 1 | 1.49:1 | 1.3 (provisional) | pass |
| window outline | tone 2 | 1.36:1 | 1.3 (provisional) | pass |
| window glow | tone 0 | 1.81:1 | 1.3 (provisional) | pass |
| window glow | tone 1 | 1.82:1 | 1.3 (provisional) | pass |
| window glow | tone 2 | 1.82:1 | 1.3 (provisional) | pass |
| text | well | 14.40:1 | 4.5 | pass |
| text | raised focus | 5.11:1 | 4.5 | pass |
| text | well focus | 9.91:1 | 4.5 | pass |
| dim text | well | 7.27:1 | 4.5 | pass |
| dim text | well focus | 5.01:1 | 4.5 | pass |
| accent | raised focus | 3.16:1 | 3 | pass |
| on-accent | accent hover | 9.94:1 | 4.5 | pass |
| on-accent | accent pressed | 6.68:1 | 4.5 | pass |
| raised focus | tone 3 | 2.07:1 | 1.2 (provisional) | pass |
| raised focus | tone 2 | 2.42:1 | 1.2 (provisional) | pass |
| well focus | tone 0 | 1.45:1 | 1.2 (provisional) | pass |
| well focus | tone 2 | 1.25:1 | 1.2 (provisional) | pass |
| well | tone 2 | 1.16:1 | 1.1 (provisional) | pass |
| well edge | tone 2 | 1.16:1 | 1.1 (provisional) | pass |
| text | danger | 4.29:1 | 4.5 | fail: use on-danger on danger, never text |
| tone 3 | tone 2 | 1.17:1 | — | tonal step |
| tone 0 | tone 2 | 1.16:1 | — | tonal step |
| tone 1 | tone 2 | 1.10:1 | — | tonal step |
| tone 0 | tone 1 | 1.06:1 | — | tonal step |

Plan P1.1 lightened dim text from `#9c958a` to `#a9a297`, the same hue and
chroma, so that it passes on tone 4, a hovered raised widget. The old value
measured 3.92:1 there and 4.56:1 (close) on tone 3.

The focused tone of the sample in spike P0.5, tone 4 mixed 30 % with accent
(`#695c45`), is the starting `raised-focus` (P1.3). The gallery shows it
beside 20 %, 40 % and 60 % (O-3).

Not yet measured: the terminal and syntax colours, which do not exist yet.

## How the check works

- **Contrast pairs are declared next to the tokens**, in
  `prototype/contrast-pairs.json` beside `prototype/tokens.css`. A pair names a
  foreground token, the background tokens it appears on, its minimum and why
  it exists.
  Adding a token that carries text or marks state means adding its pairs in
  the same change.
- **A tool measures every pair**: `tokens pairs` (see [tooling](tooling.md)).
  It exits with an error when a pair fails.
- **The same check runs in the tests**, so a token change that breaks a pair
  fails them. The tests also fail when a colour token other than `shadow`
  is in no pair, as foreground or background.
- **Try before changing.** `tokens try name=value` shows the pairs a change
  would affect, before and after.
- **Find a value that passes.** `colour solve` gives the lightness range in
  which a hue passes on a background.

## Limits of the check

- It measures the tokens, not the screen. Whether an application really
  draws a widget with the tokens it should is checked by eye in the sweep of
  each step.
- Colours an application chooses itself are outside it.
- It says nothing about other needs, such as size of targets or motion.
  Those are set by the applications and by Union, not by Amber.
