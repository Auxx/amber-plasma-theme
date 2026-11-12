# Amber — Colour scheme

> Status: **Accepted** on 2026-11-12

How Amber's colour scheme, `Amber.colors`, is made from the tokens: which
token or rule each role takes, and how that is checked. Words are used as
the [glossary](../product/glossary.md) defines them, in particular
**colour set**, **role** and **status colour**.

## The table

[`parts/colour-scheme/roles.json`](../../parts/colour-scheme/roles.json) is
the table: one entry for every role of a `.colors` file, grouped as the file
groups them. It is written by hand and refers to tokens by name; the
generator turns it into `Amber.colors` ([Generating](#generating)). This document gives the rules
behind the table and does not repeat it.

An entry has exactly one of:

- **`token`**: the role takes the token's colour. Every role that holds a
  colour is a token, never a literal colour, so that no value can bypass the
  tokens file and bring back a grey (my call, D-89). These are the roles of
  the colour sets, the `Color` of each effect and the roles of `[WM]`.
- **`value`**: a fixed number, word or switch, for the other roles. It
  carries a `why`.
- **`rule`**: a value the generator computes, described in words.

A `why` may sit on any entry and explains the entries of the same kind that
follow it in the other colour sets.

The roles a `.colors` file has are listed in `tools/src/lib/colour-scheme.mjs`
and were verified on this machine ([platform](platform.md#colour-scheme)).

## Rules

- **Selection is an accent fill**, with on-accent for every text on it,
  including the link and status colours, which lose their hue on a selection
  as Breeze's do. (decided, D-86) The Union style still draws a selected
  item as tone 4 with a block marker (D-72); Selection is what an
  application uses when it draws a selection itself, and for text selected
  in a text field.
- **Links and status colours have tokens of their own**, `link`, `visited`,
  `positive`, `neutral` and `negative`, that point to approved colours
  ([design language](design-language.md#tokens)). Danger stays a fill: as
  text it does not reach 4.5:1. (decided, D-87)
- **DecorationFocus is accent**, and on-accent in Selection, so that
  keyboard focus stays visible where an application draws its own focus
  frame. **DecorationHover equals its set's BackgroundNormal**, so that a
  hover frame never shows (D-4). (decided, D-88) A focus frame seen in an
  application is fixed in the Union style or listed as a known gap (my
  call).
- **The tones of the sets follow the prototype** (my call, D-90): Window is
  tone 2 with tone 1 as its alternate; View is tone 2 with no alternate,
  since views have no stripes; Button is tone 3 and tone 4; Header is
  tone 0 and tone 1; Tooltip is the popup tone; Complementary is tone 0 and
  tone 1.
- **A well is not the View set.** Breeze draws text fields with the View
  background; Amber's wells are tone 0 and its views tone 2, so the Union
  style draws wells from a variable of its own. Until P3.4 draws them, a
  text field shows tone 2, as P2.3 saw in Dolphin's location bar and the
  settings dialogs ([platform](platform.md#colour-scheme)). (my call, D-90)
- **Header][Inactive equals Header.** An inactive window is shown by the
  decoration, with a shadow and a dim title, not by a toolbar tone.
  (my call, D-90)
- **Effects and switches** (my call, D-91): disabled text fades towards the
  background until it has the luminance of dim text; the inactive effect is
  off; `contrast` and `frameContrast` are 0, to flatten the bevels and frames
  Qt derives; `shadeSortColumn` is off. The `Color` of each effect is tone 2,
  unused, so that the file holds no grey.
- **`[WM]`** gives the title bar's colours to decorations other than Amber's
  and to applications that read them: tone 0, with text, or dim text when
  inactive. Amber's decoration does not read it.

## Roles that are derived

KColorScheme computes some colours from the roles instead of reading them.
Amber writes none of them. What P2.3 saw of each, on 2026-11-12
([platform](platform.md#colour-scheme)):

- the background status colours (`background positive`, `neutral`,
  `negative`), tinted from a status colour into the background. The
  negative one, in Dolphin's message, is given in
  [platform](platform.md#colour-scheme); whether it reads as a grey is the
  owner's call (it reads as a dark red to me, my call). The positive and
  neutral ones were not seen;
- the frame colour (`decoration frame`), mixed with `frameContrast`: at 0 it
  equals the set's background, so the Breeze style's frames vanish into it;
- Qt's bevel roles (Light, Midlight, Mid, Dark, Shadow): `contrast=0` does
  not flatten them, but all are warm tones within two steps of Button;
- the disabled state, from `ColorEffects:Disabled`: as the generator
  computes it (below). The inactive effect is off.

## Generating

`node tools/src/bin/generate.mjs colour-scheme --write` writes
[`parts/colour-scheme/Amber.colors`](../../parts/colour-scheme/Amber.colors)
from the tokens and the table; without `--write` it prints the file. The file
is committed, and a test fails when it differs from what the generator makes
now, so a changed token is regenerated in the same change (my call, D-92).
The tool is described in the `ai-tools` skill's reference.

- **Format** (as `BreezeDark.colors`): `[group]` lines, one `Key=value` per
  line, a colour as `r,g,b` in decimal, a switch as `true` or `false`. Groups
  and keys are sorted as KConfig sorts them. A header names the licence and
  the command; the file holds no date or path, so running the generator twice
  gives the same file. (my call)
- **Refusals.** The generator writes nothing when a role is missing, a token
  is unknown or not opaque, a `rule` has no code, or a value would break the
  file.
- **The disabled `ContrastAmount`**, the table's one rule, is the amount `a`,
  rounded to two places, at which `text` faded towards `tone-2`, channel by
  channel in sRGB (`text + (tone-2 − text) × a`, as `KColorUtils::mix`
  does), has the relative luminance of `text-dim`. It is found by bisection.
  With the tokens of 2026-11-12 it is 0.34: faded text then measures 6.17:1
  on tone 2 against dim text's 6.25:1. The formula was verified in P2.3:
  the applications draw disabled text in exactly that colour
  ([platform](platform.md#colour-scheme)).

## The check

`tools/src/lib/amber-colour-scheme.spec.mjs` runs in the tests and fails when:

- a role has no entry, or a token in the table does not exist;
- a role that holds a colour has a value or a rule instead of a token;
- a foreground role of a colour set, on the set's BackgroundNormal or
  BackgroundAlternate, is not a declared
  [contrast pair](accessibility.md#how-the-check-works) of at least 4.5, or
  DecorationFocus of at least 3. Pairs are matched by colour, so `popup`
  counts the pairs of tone 3;
- a set's DecorationHover differs from its BackgroundNormal;
- the system's `BreezeDark.colors` has a group or role the list does not
  know (skipped when the file is absent);
- the committed `Amber.colors` differs from what the generator makes now;
- `Amber.colors` holds a colour that is not an opaque token's;
- faded disabled text is more than 2 % from dim text's contrast on tone 2;
- `Amber.colors` has other groups than `BreezeDark.colors` (skipped when the
  file is absent).
