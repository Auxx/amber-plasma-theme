# Amber — Vision

> Status: **Accepted** on 2026-11-11

## What Amber is

Amber is a dark theme for KDE Plasma 6 in warm tones. It is flat and quiet:
the areas of an application are told apart by steps of tone, not by lines, in
the manner of the "Islands" theme of the JetBrains IDEs. Corners are square.
A widget that is hovered or focused changes tone; it gets no outline and
no glow.

Amber is made of several parts (see the [glossary](glossary.md)) that are
installed together: a colour scheme, a Union style for widgets, a window
decoration, terminal colours for Konsole and an editor theme for Kate. A
prototype in HTML and CSS shows the look without touching system settings.

## Why

Breeze Dark is neutral to cool, outlined and rounded. The owner uses dark mode
all day and wants a warmer, calmer desktop with less visual noise.

The owner also wants to keep shaping the theme after it first works. So the
project must stay easy to change: one obvious place to change a colour, a fast
way to see the result, and documentation that says how everything fits.

## Who it is for

The owner, on their own machine: Fedora 45, KDE Plasma 6.8, with the Union
style engine. Amber is judged in the three Qt applications the owner uses every
day: Dolphin, Kate and Konsole.

## Goals

1. Dark theme in warm tones; minimalist, clean, modern.
2. Square corners everywhere. Round widgets, such as radio buttons, stay
   round.
3. No outlines and no one-pixel separators inside a window. Separation is by
   tone only. A window itself has a thin window outline, so that windows
   which overlap can be told apart.
4. Hovered and focused widgets are shown by a change of tone alone. Subtle
   shadows may add depth.
5. Covers application widgets and window decorations.
6. Widgets are styled through Union.
7. Konsole's terminal area and Kate's editor area match the frame around them.
8. A small HTML and CSS prototype for trying changes safely.
9. Text and indicators are readable: colour pairs are checked against WCAG
   (the version, level and rules are in
   [accessibility](../architecture/accessibility.md)).
10. Living documentation that stays true as the project changes.

## Non-goals

Decided by the owner:

- Icons. Breeze icons stay.
- Fonts. Noto stays.
- A light variant. Dark comes first; nothing is built for light, and nothing
  should make it impossible later.
- Vivaldi, WebStorm and other applications that draw their own widgets.

Chosen by the designer, open to change:

- The Plasma shell (panel, launcher, desktop widgets), GTK applications, the
  login screen, the splash screen, cursors, and a global theme package.
- Publishing to the KDE Store.

## Anti-goals

These fail Amber even if everything else works:

- any rounded corner (a round widget is not one; see the
  [glossary](glossary.md));
- any hairline border or divider, except the window outline (see the
  [glossary](glossary.md));
- any cool grey tone: every neutral leans warm.

Where the platform forces one of these and it cannot be removed, it is
recorded as a known gap, not hidden.

## What success looks like

- The owner has approved the prototype.
- With every part installed and selected, Dolphin, Kate and Konsole show no
  rounded corner, no hairline but the window outline and no cool grey, and
  buttons and text fields
  change tone when hovered or focused.
- Kate's editor area and Konsole's terminal area match their frames.
- Every declared contrast pair passes its check.
- Changing one token and following the documented steps updates every part.
- Installing and uninstalling each take one command, and uninstalling leaves
  the system as it was.
- Known gaps are listed in the README.

The order of work and its small plans are in the [roadmap](roadmap.md).
