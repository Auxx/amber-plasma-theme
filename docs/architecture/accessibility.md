# Amber — Accessibility: contrast

> Status: **Accepted** on 2026-11-11. One question is deferred to the
> prototype; see "Open question".

Amber checks its colours against the contrast rules of WCAG 2.2, level AA.
WCAG is written for web content, but its contrast measure works for any pair
of colours, so it can be used for a desktop theme as it stands.

## What WCAG asks

| Criterion | Asks for | Applies in Amber to |
|---|---|---|
| 1.4.3 Contrast (Minimum) | 4.5:1 for text; 3:1 for large text | all text and icons on every surface they appear on |
| 1.4.11 Non-text Contrast | 3:1 for the features of a control needed to identify it and its state, against what is next to them | check marks, block markers, slider and progress fills, the glow |
| 2.4.7 Focus Visible | the focused control can be seen | the focused glow |

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
4. **Focused glow: 3:1 at its strongest point** against the surface around
   it, measured as the accent at the glow's alpha composited over the
   surface. This is a target to tune in the prototype, not yet a hard rule:
   a blur has no single colour, so the measure is approximate.
5. **A pair that passes by less than 2 % is close** and is reported as a
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

## First measurements

Measured on 2026-11-11 on the starting tokens, with the `colour` tool (see
the `ai-tools` skill). The tools' tests pin several of these values.

| Foreground | Background | Ratio | Rule | Result |
|---|---|---|---|---|
| text | tone 0 | 14.40:1 | 4.5 | pass |
| text | tone 1 | 13.58:1 | 4.5 | pass |
| text | tone 2 | 12.38:1 | 4.5 | pass |
| text | tone 3 | 10.58:1 | 4.5 | pass |
| text | tone 4 | 9.11:1 | 4.5 | pass |
| dim text | tone 0 | 6.20:1 | 4.5 | pass |
| dim text | tone 1 | 5.85:1 | 4.5 | pass |
| dim text | tone 2 | 5.33:1 | 4.5 | pass |
| dim text | tone 3 | 4.56:1 | 4.5 | pass (close) |
| dim text | tone 4 | 3.92:1 | 4.5 | fail: settled in plan P1.1 |
| on-accent | accent | 8.72:1 | 4.5 | pass |
| accent | tone 0 | 8.91:1 | 3 | pass |
| accent | tone 1 | 8.40:1 | 3 | pass |
| accent | tone 2 | 7.66:1 | 3 | pass |
| accent | tone 3 | 6.54:1 | 3 | pass |
| on-danger | danger | 4.97:1 | 4.5 | pass |
| text | danger | 4.29:1 | 4.5 | fail: use on-danger on danger, never text |
| tone 3 | tone 2 | 1.17:1 | — | tonal step |
| tone 0 | tone 2 | 1.16:1 | — | tonal step |
| tone 1 | tone 2 | 1.10:1 | — | tonal step |
| tone 0 | tone 1 | 1.06:1 | — | tonal step |

Dim text fails on tone 4, a hovered raised widget. Plan P1.1 settles it by
lightening dim text or by not using it on tone 4.

The focused glow at its starting strength, accent at 45 % alpha over tone 2,
measures 2.67:1, below the 3:1 target of rule 4. It is tuned in the
prototype.

Not yet measured: the terminal and syntax colours, which do not exist yet.

## How the check works

- **Contrast pairs are declared next to the tokens.** A pair names a
  foreground token, the background tokens it appears on, and its minimum.
  Adding a token that carries text or marks state means adding its pairs in
  the same change.
- **A tool measures every pair**: `tokens pairs` (see [tooling](tooling.md)).
  It exits with an error when a pair fails.
- **The same check runs in the tests**, so a token change that breaks a pair
  fails them.
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
