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
generator (P2.2) turns it into `Amber.colors`. This document gives the rules
behind the table and does not repeat it.

An entry has exactly one of:

- **`token`**: the role takes the token's colour. Every role of a colour set
  is a token, never a literal colour, so that no value can bypass the tokens
  file and bring back a grey (my call, D-89).
- **`value`**: a fixed number, word or switch, for the groups that are not
  colour sets. It carries a `why`.
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
  application is fixed in the Union style or listed as a known gap.
- **The tones of the sets follow the prototype** (my call, D-90): Window is
  tone 2 with tone 1 as its alternate; View is tone 2 with no alternate,
  since views have no stripes; Button is tone 3 and tone 4; Header is
  tone 0 and tone 1; Tooltip is the popup tone; Complementary is tone 0 and
  tone 1.
- **A well is not the View set.** Breeze draws text fields with the View
  background; Amber's wells are tone 0 and its views tone 2, so the Union
  style draws wells from a variable of its own. Outside the style a text
  field shows tone 2, which is a known gap if P2.3 sees it. (my call, D-90)
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
Amber writes none of them, and each is checked by eye in P2.3:

- the background status colours (`background positive`, `neutral`,
  `negative`), mixed from a status colour and the background;
- the frame colour (`decoration frame`), mixed with `frameContrast`;
- Qt's bevel roles (Light, Mid, Dark, Shadow), from `contrast`;
- the disabled and inactive states, from the effects.

## The check

`tools/src/lib/amber-colour-scheme.spec.mjs` runs in the tests and fails when:

- a role has no entry, or a token in the table does not exist;
- a foreground role of a colour set, on the set's BackgroundNormal or
  BackgroundAlternate, is not a declared
  [contrast pair](accessibility.md#how-the-check-works) of at least 4.5, or
  DecorationFocus of at least 3. Pairs are matched by colour, so `popup`
  counts the pairs of tone 3;
- a set's DecorationHover differs from its BackgroundNormal;
- the system's `BreezeDark.colors` has a group or role the list does not
  know (skipped when the file is absent).
