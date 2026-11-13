# Amber — Accessibility: contrast

> Status: **Accepted** on 2026-11-11.

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
   can appear on; on-accent reaches it on accent, and on-danger on danger.
   The link and status colours of the colour scheme reach it on tones 0 to 4
   ([measured](#first-measurements) in P2.1). The lower 3:1 for large text
   is not used. Dim text on raised focus measures 2.58:1 (measured
   2026-11-11, P1.5), so a focused item shows its secondary columns, and a
   focused tree folder its chevron, in text.
2. **Indicators: 3:1.** Accent reaches 3:1 against every tone it marks: the
   check mark's fill against the surface, a selected tab's block marker
   against the tab, a fill against its track. The tab's marker is measured
   on tone 2 (7.66:1) and on a focused selected tab (surface focus,
   6.13:1). A menu's tick is accent on the popup tone (6.54:1). The marker
   carries a tab's 3:1. **A selected item carries no marker** (decided,
   D-111): a selected file, list item or place is told by its tone alone,
   a tonal step kept above a floor of 1.1 (my call): 1.36:1 on tone 2 and
   1.49:1 on tone 1, below 3:1.
3. **Syntax and terminal colours.** The syntax colours reach 4.5:1 on
   every background they are read on: the editor, the current line, the
   text selection and the search highlight. The text selection and the
   search highlight are the hardest of these.
   It is accent 20 % over tone 2, so that it stands apart from the current
   line (1.29:1; decided, D-82). Six syntax colours keep 4.5:1 on it
   (4.60:1 to 5.08:1). **A comment inside a text selection does not:** it
   measures 4.15:1, and the owner accepts that, since a comment is
   low-priority text. Its pair there has a floor of 4 (my call, D-84).
   The search highlight is as dark as it can be while it stands 1.1 apart
   from both the current line and the text selection, with a chroma of 0.06
   so that it is a hue and not a grey (my call, P4.2); every
   syntax colour keeps 4.5:1 on it, and a comment, with the same floor of
   4, measures 4.73:1. The gutter's marks (breakpoints, bookmarks,
   modified and saved lines) are syntax colours at 3:1 on the gutter.
   The terminal's foreground, white and the bright colours other than
   bright black reach 4.5:1 on the terminal. ANSI black is exempt, since it is meant to match a dark
   background. **The greys are four steps** (decided, D-119): black, dark
   grey (bright black), light grey (white) and white (bright white), as a
   DOS terminal had them. Bright black, the dark grey of dim output and
   shell suggestions, measures 3.14:1 on the terminal; the owner reads
   fish's suggestions easily at that, and its pair has a minimum of 3.
   **White on a normal colour measures 2.33:1 to 2.35:1**, below the 3.5:1
   of the normal colours' other pairs: Midnight Commander's default skin
   draws its panels in it. The owner chose the four clear greys over a
   lighter white that would reach 3:1 at 85 %, and that pairing has no
   contrast pair (decided, D-119). **The six normal colours reach 3.5:1 as text,
   not 4.5:1**, because programs also draw them as backgrounds under light
   text: Midnight Commander's panels, status badges, powerline prompts.
   No colour does both at 4.5:1 on tone 1: the two meet near 3:1 as text
   and 4.4:1 under text. The owner chose the set that does each at about
   3.7:1 (decided, D-80): 3.69:1 to 3.73:1 as text, the terminal's
   foreground on them at 3.64:1 to 3.68:1, and bright white at 4.13:1 to
   4.18:1 (measured 2026-11-13, after cyan gained chroma in D-119). A darker set at 3:1 as text was harder to
   read on the dark terminal. Both directions have pairs with a minimum
   of 3.5 (my call, D-81). Amber accepts that these do not reach 4.5:1.
4. **Focused widgets.** A focused raised widget, toggle, tab or scroll
   area is shown by a tone tinted with accent. Text on the focused tone
   reaches 4.5:1 like any other text. The tints are accent 30 % over
   tone 4 for a raised widget and over tone 1 for a toggle (decided,
   D-64). The pairs of `raised-focus`, `toggle-focus` and
   `surface-focus` against the widget at rest and the surface have a
   minimum of 1.2 (my call, D-77): a floor, not a WCAG rule.
   A focused well is not shown by a tint. It stays below the surface, at
   tone 1, and carries a focus bar: accent, three pixels high, at its
   foot. (decided, D-69) The bar is the cue: `well-focus-edge` reaches 3:1
   on the focused well (8.40:1) and on the surface (7.66:1). The focused
   well's tone has no minimum against the well at rest or the surface
   (1.06:1 and 1.10:1; my call, D-70), because no tone that stays below
   the surface can reach one. Text and the placeholder keep 4.5:1 on it.
   A primary button and a checked toggle are already accent, so they show
   focus with their hovered tone and have no focused tone of their own.
   (decided, D-76)
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

### The owner's decision

The owner looked at these controls in the prototype, beside candidates
with a darker well, a lighter box, a lighter track and a bar at the foot
of every well, and decided on 2026-11-12 to keep them as they were: an
empty well, an unchecked toggle and an empty track are tone 0 on the
surface and are told from it by tone alone. (decided, D-75) Amber accepts
that they do not reach 3:1.

- The pairs of `well`, `toggle`, `track` and the three thumb tokens on the
  surfaces they sit on have a minimum of 1.1 (my call, D-77): a floor
  that keeps the step from fading, not a WCAG rule.
- **A darker well could not get there.** Even black measures only 1.33:1
  on tone 2 (measured 2026-11-11).
- **A track could not carry a 3:1 cue by itself.** A track at 3:1 on tone 2
  (`#746e63`, 3.13:1) drops the accent fill on it to 2.45:1, below rule 2.

## First measurements

Measured on 2026-11-11 on the tokens of plans P1.1 to P1.6; the rows of the
terminal colours again on 2026-11-13, after D-119. `node tools/src/bin/tokens.mjs
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
| text | well focus | 13.58:1 | 4.5 | pass |
| dim text | well | 7.27:1 | 4.5 | pass |
| dim text | well focus | 6.86:1 | 4.5 | pass |
| accent | raised focus | 3.16:1 | 3 | pass |
| on-accent | accent hover | 9.94:1 | 4.5 | pass |
| on-accent | accent pressed | 6.68:1 | 4.5 | pass |
| accent hover | tone 2 | 8.74:1 | 3 | pass |
| raised focus | tone 3 | 2.07:1 | 1.2 (floor) | pass |
| raised focus | tone 2 | 2.42:1 | 1.2 (floor) | pass |
| well | tone 2 | 1.16:1 | 1.1 (floor) | pass |
| accent | track | 8.91:1 | 3 | pass |
| dim text | toggle | 7.27:1 | 3 | pass |
| dim text | track | 7.27:1 | 3 | pass |
| toggle | tone 2 | 1.16:1 | 1.1 (floor) | pass |
| well hover | tone 1 | 1.22:1 | 1.1 (floor) | pass |
| well hover | toggle | 1.29:1 | 1.1 (floor) | pass |
| track | tone 2 | 1.16:1 | 1.1 (floor) | pass |
| thumb | tone 2 | 1.36:1 | 1.1 (floor) | pass |
| thumb | tone 1 | 1.49:1 | 1.1 (floor) | pass |
| thumb hover | tone 2 | 2.05:1 | 1.1 (floor) | pass |
| thumb hover | tone 1 | 2.24:1 | 1.1 (floor) | pass |
| thumb pressed | tone 2 | 3.13:1 | 1.1 (floor) | pass |
| thumb pressed | tone 1 | 3.43:1 | 1.1 (floor) | pass |
| toggle focus | tone 2 | 1.74:1 | 1.2 (floor) | pass |
| toggle focus | toggle | 2.02:1 | 1.2 (floor) | pass |
| surface focus | tone 0 | 1.45:1 | 1.2 (floor) | pass |
| surface focus | tone 2 | 1.25:1 | 1.2 (floor) | pass |
| text | surface focus | 9.91:1 | 4.5 | pass |
| dim text | surface focus | 5.01:1 | 4.5 | pass |
| accent | surface focus | 6.13:1 | 3 | pass |
| well focus edge | well focus | 8.40:1 | 3 | pass |
| well focus edge | tone 2 | 7.66:1 | 3 | pass |
| text | selected | 9.11:1 | 4.5 | pass |
| text | popup | 10.58:1 | 4.5 | pass |
| dim text | selected | 4.60:1 | 4.5 | pass |
| dim text | popup | 5.34:1 | 4.5 | pass |
| accent | selected | 5.63:1 | 3 | pass |
| accent | well focus | 8.40:1 | 3 | pass |
| accent | popup | 6.54:1 | 3 | pass |
| selected | tone 2 | 1.36:1 | 1.1 (floor) | pass |
| selected | tone 1 | 1.49:1 | 1.1 (floor) | pass |
| text | editor | 12.38:1 | 4.5 | pass |
| text | editor gutter | 13.58:1 | 4.5 | pass |
| text | editor current line | 10.58:1 | 4.5 | pass |
| text | editor selection | 8.22:1 | 4.5 | pass |
| dim text | editor gutter | 6.86:1 | 4.5 | pass |
| terminal text | terminal | 13.58:1 | 4.5 | pass |
| terminal text | ansi red | 3.68:1 | 3.5 | pass |
| terminal text | ansi green | 3.68:1 | 3.5 | pass |
| terminal text | ansi yellow | 3.66:1 | 3.5 | pass |
| terminal text | ansi blue | 3.65:1 | 3.5 | pass |
| terminal text | ansi magenta | 3.64:1 | 3.5 | pass |
| terminal text | ansi cyan | 3.64:1 | 3.5 | pass |
| ansi red | terminal | 3.69:1 | 3.5 | pass |
| ansi green | terminal | 3.69:1 | 3.5 | pass |
| ansi yellow | terminal | 3.71:1 | 3.5 | pass |
| ansi blue | terminal | 3.72:1 | 3.5 | pass |
| ansi magenta | terminal | 3.73:1 | 3.5 | pass |
| ansi cyan | terminal | 3.73:1 | 3.5 | pass |
| ansi white | terminal | 8.68:1 | 4.5 | pass |
| ansi bright black | terminal | 3.14:1 | 3 | pass |
| ansi bright red | terminal | 11.44:1 | 4.5 | pass |
| ansi bright green | terminal | 11.96:1 | 4.5 | pass |
| ansi bright yellow | terminal | 12.89:1 | 4.5 | pass |
| ansi bright blue | terminal | 11.81:1 | 4.5 | pass |
| ansi bright magenta | terminal | 11.38:1 | 4.5 | pass |
| ansi bright cyan | terminal | 12.49:1 | 4.5 | pass |
| ansi bright white | terminal | 15.41:1 | 4.5 | pass |
| syntax keyword | editor | 6.98:1 | 4.5 | pass |
| syntax keyword | editor current line | 5.96:1 | 4.5 | pass |
| syntax keyword | editor selection | 4.63:1 | 4.5 | pass |
| syntax function | editor | 6.92:1 | 4.5 | pass |
| syntax function | editor current line | 5.92:1 | 4.5 | pass |
| syntax function | editor selection | 4.60:1 | 4.5 | pass |
| syntax type | editor | 7.31:1 | 4.5 | pass |
| syntax type | editor current line | 6.25:1 | 4.5 | pass |
| syntax type | editor selection | 4.85:1 | 4.5 | pass |
| syntax string | editor | 7.03:1 | 4.5 | pass |
| syntax string | editor current line | 6.00:1 | 4.5 | pass |
| syntax string | editor selection | 4.66:1 | 4.5 | pass |
| syntax number | editor | 6.99:1 | 4.5 | pass |
| syntax number | editor current line | 5.97:1 | 4.5 | pass |
| syntax number | editor selection | 4.64:1 | 4.5 | pass |
| syntax preprocessor | editor | 7.66:1 | 4.5 | pass |
| syntax preprocessor | editor current line | 6.54:1 | 4.5 | pass |
| syntax preprocessor | editor selection | 5.08:1 | 4.5 | pass |
| syntax comment | editor | 6.25:1 | 4.5 | pass |
| syntax comment | editor current line | 5.34:1 | 4.5 | pass |
| syntax comment | editor selection | 4.15:1 | 4 (floor) | pass |
| editor selection | editor | 1.51:1 | 1.1 (floor) | pass |
| editor selection | editor current line | 1.29:1 | 1.1 (floor) | pass |
| editor current line | editor | 1.17:1 | 1.1 (floor) | pass |
| text | editor search | 9.37:1 | 4.5 | pass |
| syntax keyword | editor search | 5.28:1 | 4.5 | pass |
| syntax function | editor search | 5.24:1 | 4.5 | pass |
| syntax type | editor search | 5.54:1 | 4.5 | pass |
| syntax string | editor search | 5.32:1 | 4.5 | pass |
| syntax number | editor search | 5.29:1 | 4.5 | pass |
| syntax preprocessor | editor search | 5.80:1 | 4.5 | pass |
| syntax comment | editor search | 4.73:1 | 4 (floor) | pass |
| editor search | editor | 1.32:1 | 1.1 (floor) | pass |
| editor search | editor current line | 1.13:1 | 1.1 (floor) | pass |
| editor search | editor selection | 1.14:1 | 1.1 (floor) | pass |
| syntax number | editor gutter | 7.66:1 | 3 | pass |
| syntax preprocessor | editor gutter | 8.40:1 | 3 | pass |
| syntax string | editor gutter | 7.70:1 | 3 | pass |
| syntax function | editor gutter | 7.59:1 | 3 | pass |
| syntax type | editor gutter | 8.02:1 | 3 | pass |
| link | tone 4 | 5.10:1 | 4.5 | pass |
| visited | tone 4 | 5.13:1 | 4.5 | pass |
| positive | tone 4 | 5.17:1 | 4.5 | pass |
| negative | tone 4 | 5.14:1 | 4.5 | pass |
| neutral | tone 4 | 5.63:1 | 4.5 | pass |
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
(`#695c45`), is `raised-focus` (P1.3; decided, D-64).

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
- **The colour scheme makes no pairing that is not declared.** Every text
  role of a colour set, on that set's backgrounds, must be a pair of at
  least 4.5, and its focus decoration a pair of at least 3; a test fails
  otherwise ([colour-scheme](colour-scheme.md#the-check)).
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
