# Amber

Amber is a dark theme for KDE Plasma 6 in warm tones. It is flat and quiet:
the areas of an application are told apart by steps of tone, not by lines.
Corners are square. A widget that is hovered or focused changes tone; it
gets no outline and no glow.

## Status

Amber is in early development and nothing can be installed yet.

## Documentation

- [Vision](docs/product/vision.md)
- [Roadmap](docs/product/roadmap.md)
- [Architecture overview](docs/architecture/overview.md)

## Known gaps

- **Icons are the icon theme's.** Breeze's full-colour file and
  application icons, such as the text file, PDF and network drive icons,
  hold cool greys. Amber has no icon theme. (seen in P2.3)
- **No primary button.** In applications built with Qt Widgets, such as
  Dolphin, Kate and Konsole, the Union style cannot tell a dialog's
  default button from its other buttons, so all are drawn alike. The same
  rule serves Qt Quick applications, so their primary button is drawn
  plain too. (seen in P3.3; D-100)
- **The text cursor is a cool grey.** Qt draws it inverted over what is
  under it, so on a field it is a light cool grey such as `#eaebec`.
  Neither the colour scheme nor the Union style can colour it. (seen in
  P2.3 and P3.4; D-94)
- **A text area is not a well.** In Qt Widgets applications Qt fills a text
  area from the colour scheme's View colour, tone 2, which the Union style
  cannot reach. It still shows the focus bar. (seen in P3.4; D-104)
- **A spin box's step arrows are drawn in text**, with no hovered or
  pressed tone, in Qt Widgets applications: Qt draws them itself. (seen in
  P3.4; D-104)
- **Disabled text in a field** is the colour scheme's `#a6a19a`, and a
  disabled placeholder `#7c766e`, not dim text: Qt draws them from the
  colour scheme. (seen in P3.4; D-104)
- **A busy progress bar is a full fill.** In Qt Widgets applications Union
  fills the whole track with accent, where Amber's design moves a 32 px
  block along it; no rule reaches it. (seen in P3.5; D-107)
- **A slider shows 9 of its tick marks out of 11**: Union leaves out the
  two at the ends and the one under the thumb. (seen in P3.5; D-107)
- **A tab bar is tone 0 only under its tabs.** Union draws no tab bar, so
  each tab paints tone 0 itself and past the last tab the bar shows the
  window's tone 1. (seen in P3.6; D-109)
- **A scrollbar's track shows the window's tone.** Beside a tone 2 view,
  such as Dolphin's, the clear track is a 12 px strip of tone 1, and where
  both scrollbars show, their corner is a tone 1 square: what lies behind
  them is out of the style's reach. (seen in P3.6; D-109)
- **The status bar's text is text, not dim text**: Qt draws it from the
  colour scheme. (seen in P3.6; D-109)
- **A disabled menu title looks enabled**: Union gives it no disabled
  state. (seen in P3.6; D-109)
- **A scrollbar's thumb lightens whenever the pointer is over its bar**,
  not only over the thumb. (seen in P3.6; D-109)
- **KWin dims the window behind a dialog**, which darkens and desaturates
  its tones towards a neutral near-black. It is KWin's dialog parent
  effect, a system setting. (seen in P2.3)

## Licence

MIT. See [LICENSE](LICENSE).

The Union style in `parts/union-style/amber/` is a copy of KDE's Breeze
style and stays BSD-2-Clause, with its notices and its own `LICENSE`. The
rest of Amber is MIT.
