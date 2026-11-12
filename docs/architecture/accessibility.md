# Amber — Accessibility: contrast

> Status: **Accepted** on 2026-11-11. Two questions are deferred to
> the prototype: O-1 and O-3 in the [decisions](decisions.md). O-5,
> light text on ANSI colours, is open too.

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
   is not used. Dim text on raised focus measures 2.58:1 (measured
   2026-11-11, P1.5), so a focused item shows its secondary columns, and a
   focused tree folder its chevron, in text.
2. **Indicators: 3:1.** Accent reaches 3:1 against every tone it marks: the
   check mark's fill against the surface, a block marker against its item, a
   fill against its track. The block marker is measured on the selected tone
   (6.54:1), on a hovered selected item (tone 4, 5.63:1), on a focused one
   (raised focus, 3.16:1) and on a focused selected tab (well focus,
   6.13:1). A menu's tick is accent on the popup tone (6.54:1). It carries a selection's 3:1: the selected tone itself is a
   tonal step, kept above a floor of 1.1 (my call).
3. **Syntax and terminal colours: 4.5:1** against every background they
   are read on: the terminal colours on the terminal; the syntax colours on
   the editor, the current line and the text selection. ANSI black is
   exempt, since it is meant to match a dark background. The text selection
   is the hardest of these: comments in dim text measure 4.71:1 on it, and
   fail beyond a tint of about 14 % accent (4.50:1, FAIL, at 16 %; measured
   2026-11-11, P1.6). Programs such as `less` and `htop` also draw ANSI
   colours as backgrounds. With the terminal background or ANSI black as
   text, contrast is symmetric, so those are the same ratios as the pairs on
   the terminal, and ANSI black, darker than the terminal, passes wherever
   they do; they need no pairs of their own. **Light text on an ANSI
   colour is not checked and does not pass:** text measures 1.62:1 to
   1.88:1 on the six normal colours, and bright white 1.84:1 to 2.13:1
   (measured 2026-11-11, P1.6). Midnight Commander's blue panels, powerline
   prompts and some `ls` colours draw that. It is open question O-5 in the
   [decisions](decisions.md). The text selection and the
   current line are told apart by a floor of 1.1 (1.13:1) and by the
   accent's hue (my call).
4. **Focused widgets: open.** A focused widget is shown by a tone tinted
   with accent. How far that tone must stand from the widget at rest and
   from the surface is open question O-3 in the [decisions](decisions.md).
   Text on the focused tone reaches 4.5:1 like any other text, and so does
   the placeholder of a focused well. Until O-3 is closed, the pairs of
   `raised-focus` and `well-focus` against the widget at rest and the
   surface have a provisional minimum of 1.2 (my call): a floor, not a WCAG
   rule. A placeholder in dim text passes 4.5:1 on a focused well tinted up to
   20 %, but close at 20 % (4.57:1), and fails beyond it (3.60:1 at 30 %),
   which caps the tint of a focused well near 20 %. A focused toggle holds
   no text, so no cap applies to it: `toggle-focus` has the same
   provisional 1.2 against tone 2 and the toggle at rest, and is accent
   30 % over tone 1 (decided, D-64), which measures 1.74:1 and 2.02:1.
   The owner finds the focused well's starting tone too light: it sits
   above the surface and looks raised. A focused well that stays below
   the surface cannot reach the provisional 1.2 by tone (1.10:1 at most
   against the well at rest), so the gallery shows a bar of accent at the
   foot of the focused well as a cue, `well-focus-edge`, which reaches
   3:1 on the well and on the surface (measured 2026-11-12, P1.7).
5. **Window outline: 2:1.** The window outline tells one window from the
   window behind it, and reaches 2:1 against tones 0 to 2, the tones a
   window shows at its edge. (decided, D-62; the minimum of the pairs is
   my call, D-63) It is not measured against the window glow (decided,
   D-62), against which it reaches 1.84:1 over tone 0, nor against the
   desktop, which may be any wallpaper. The window glow marks the active
   window, as the dim title text of an inactive window marks the same
   state. The glow is a faint indicator and has no contrast minimum and
   no pair (decided, D-60): at accent 14 % it measures 1.29:1, 1.31:1 and
   1.33:1 over tones 0, 1 and 2 (2026-11-12). The shadow shows no state
   and has no pair.
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
- Since P1.4 the gallery also shows candidates for the unchecked toggle and
  the empty track. `toggle`, `track` and the three thumb tokens have the same
  provisional 1.1 on the surfaces they sit on (my call).
- **A track cannot carry a 3:1 cue by itself.** A track at 3:1 on tone 2
  (`#746e63`, 3.13:1) drops the accent fill on it to 2.45:1, below rule 2.
  On a 2:1 track the fill keeps 3.74:1 (measured 2026-11-11).

## First measurements

Measured on 2026-11-11 on the tokens of plans P1.1 to P1.6. `node tools/src/bin/tokens.mjs
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
| window outline | tone 0 | 2.38:1 | 2 | pass |
| window outline | tone 1 | 2.24:1 | 2 | pass |
| window outline | tone 2 | 2.05:1 | 2 | pass |
| text | well | 14.40:1 | 4.5 | pass |
| text | raised focus | 5.11:1 | 4.5 | pass |
| text | well focus | 9.91:1 | 4.5 | pass |
| dim text | well | 7.27:1 | 4.5 | pass |
| dim text | well focus | 5.01:1 | 4.5 | pass |
| accent | raised focus | 3.16:1 | 3 | pass |
| on-accent | accent hover | 9.94:1 | 4.5 | pass |
| on-accent | accent pressed | 6.68:1 | 4.5 | pass |
| accent hover | tone 2 | 8.74:1 | 3 | pass |
| raised focus | tone 3 | 2.07:1 | 1.2 (provisional) | pass |
| raised focus | tone 2 | 2.42:1 | 1.2 (provisional) | pass |
| well focus | tone 0 | 1.45:1 | 1.2 (provisional) | pass |
| well focus | tone 2 | 1.25:1 | 1.2 (provisional) | pass |
| well | tone 2 | 1.16:1 | 1.1 (provisional) | pass |
| well edge | tone 2 | 1.16:1 | 1.1 (provisional) | pass |
| accent | track | 8.91:1 | 3 | pass |
| toggle | tone 2 | 1.16:1 | 1.1 (provisional) | pass |
| track | tone 2 | 1.16:1 | 1.1 (provisional) | pass |
| thumb | tone 2 | 1.36:1 | 1.1 (provisional) | pass |
| thumb | tone 1 | 1.49:1 | 1.1 (provisional) | pass |
| thumb hover | tone 2 | 2.05:1 | 1.1 (provisional) | pass |
| thumb hover | tone 1 | 2.24:1 | 1.1 (provisional) | pass |
| thumb pressed | tone 2 | 3.13:1 | 1.1 (provisional) | pass |
| thumb pressed | tone 1 | 3.43:1 | 1.1 (provisional) | pass |
| toggle focus | tone 2 | 1.74:1 | 1.2 (provisional) | pass |
| toggle focus | toggle | 2.02:1 | 1.2 (provisional) | pass |
| surface focus | tone 0 | 1.45:1 | 1.2 (provisional) | pass |
| surface focus | tone 2 | 1.25:1 | 1.2 (provisional) | pass |
| text | surface focus | 9.91:1 | 4.5 | pass |
| dim text | surface focus | 5.01:1 | 4.5 | pass |
| accent | surface focus | 6.13:1 | 3 | pass |
| well focus edge | well focus | 6.13:1 | 3 | pass |
| well focus edge | tone 2 | 7.66:1 | 3 | pass |
| text | selected | 10.58:1 | 4.5 | pass |
| text | popup | 10.58:1 | 4.5 | pass |
| dim text | selected | 5.34:1 | 4.5 | pass |
| dim text | popup | 5.34:1 | 4.5 | pass |
| accent | selected | 6.54:1 | 3 | pass |
| accent | well focus | 6.13:1 | 3 | pass |
| accent | popup | 6.54:1 | 3 | pass |
| selected | tone 2 | 1.17:1 | 1.1 (floor) | pass |
| selected | tone 1 | 1.28:1 | 1.1 (floor) | pass |
| text | editor | 12.38:1 | 4.5 | pass |
| text | editor gutter | 13.58:1 | 4.5 | pass |
| text | editor current line | 10.58:1 | 4.5 | pass |
| text | editor selection | 9.33:1 | 4.5 | pass |
| dim text | editor gutter | 6.86:1 | 4.5 | pass |
| terminal text | terminal | 12.38:1 | 4.5 | pass |
| ansi red | terminal | 6.61:1 | 4.5 | pass |
| ansi green | terminal | 7.03:1 | 4.5 | pass |
| ansi yellow | terminal | 7.66:1 | 4.5 | pass |
| ansi blue | terminal | 6.92:1 | 4.5 | pass |
| ansi magenta | terminal | 6.59:1 | 4.5 | pass |
| ansi cyan | terminal | 7.31:1 | 4.5 | pass |
| ansi white | terminal | 12.38:1 | 4.5 | pass |
| ansi bright black | terminal | 6.25:1 | 4.5 | pass |
| ansi bright red | terminal | 8.79:1 | 4.5 | pass |
| ansi bright green | terminal | 9.29:1 | 4.5 | pass |
| ansi bright yellow | terminal | 9.96:1 | 4.5 | pass |
| ansi bright blue | terminal | 9.16:1 | 4.5 | pass |
| ansi bright magenta | terminal | 8.78:1 | 4.5 | pass |
| ansi bright cyan | terminal | 9.52:1 | 4.5 | pass |
| ansi bright white | terminal | 14.05:1 | 4.5 | pass |
| syntax keyword | editor | 6.59:1 | 4.5 | pass |
| syntax keyword | editor current line | 5.63:1 | 4.5 | pass |
| syntax keyword | editor selection | 4.97:1 | 4.5 | pass |
| syntax function | editor | 6.92:1 | 4.5 | pass |
| syntax function | editor current line | 5.92:1 | 4.5 | pass |
| syntax function | editor selection | 5.22:1 | 4.5 | pass |
| syntax type | editor | 7.31:1 | 4.5 | pass |
| syntax type | editor current line | 6.25:1 | 4.5 | pass |
| syntax type | editor selection | 5.51:1 | 4.5 | pass |
| syntax string | editor | 7.03:1 | 4.5 | pass |
| syntax string | editor current line | 6.00:1 | 4.5 | pass |
| syntax string | editor selection | 5.30:1 | 4.5 | pass |
| syntax number | editor | 6.61:1 | 4.5 | pass |
| syntax number | editor current line | 5.64:1 | 4.5 | pass |
| syntax number | editor selection | 4.98:1 | 4.5 | pass |
| syntax preprocessor | editor | 7.66:1 | 4.5 | pass |
| syntax preprocessor | editor current line | 6.54:1 | 4.5 | pass |
| syntax preprocessor | editor selection | 5.77:1 | 4.5 | pass |
| syntax comment | editor | 6.25:1 | 4.5 | pass |
| syntax comment | editor current line | 5.34:1 | 4.5 | pass |
| syntax comment | editor selection | 4.71:1 | 4.5 | pass |
| editor selection | editor | 1.33:1 | 1.1 (floor) | pass |
| editor selection | editor current line | 1.13:1 | 1.1 (floor) | pass |
| editor current line | editor | 1.17:1 | 1.1 (floor) | pass |
| syntax comment | accent 16 % over tone 2 (`#41392c`) | 4.50:1 (4.496) | 4.5 | fail: caps the text selection's tint near 14 % |
| text | danger | 4.29:1 | 4.5 | fail: use on-danger on danger, never text |
| dim text | raised focus | 2.58:1 | 4.5 | fail: a focused item shows secondary text in text |
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
