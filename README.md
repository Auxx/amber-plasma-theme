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
- **A table's grid is a faint dark line.** An application that leaves a
  table view's grid on shows a 1 px line, `#191816`, between its cells: Qt
  draws it from a colour the colour scheme derives, out of the style's
  reach. Dolphin's and Kate's main views have none. (seen in P3.7; D-110)
- **An item's text starts at its edge** in Qt Widgets applications: Union
  ignores an item's padding, so a list's text has no 12 px margin. Dolphin
  lays out its own items and is not affected. (seen in P3.7; D-113)
- **A table or tree tints one cell, not the row.** In a table, hover
  lightens the cell under the pointer; in a table or tree, keyboard focus
  tints the current cell. Qt gives Union one cell at a time. (seen in
  P3.7; D-113)
- **A tree's indentation is never filled**: a selected or hovered tree row
  starts at its item, right of its chevron. (seen in P3.7; D-113)
- **A view's own background is the colour scheme's**, out of the style's
  reach: a settings dialog's page list is tone 2 on the dialog's tone 1
  body, and a header past its last section shows tone 1. (seen in P3.7;
  D-113)
- **Menu labels need not line up.** A menu item's label starts after its
  icon, or at its padding when it has none. (seen in P3.8; D-115)
- **A message has a line at its foot.** A message such as Dolphin's "does
  not exist" draws itself, with a 1 px line of a darker red along its
  foot. (seen in P3.8; D-115)
- **A tooltip's padding is Qt's**: Qt sizes a tooltip in Qt Widgets
  applications. (seen in P3.8; D-115)
- **Messages draw Breeze's colours.** A message is drawn in Breeze's
  fixed colours, not Amber's: a warning, such as Konsole's "output
  suspended", is orange with a frame 2 px wide, and an information message,
  such as Kate's "modified on disk", is blue with a 1 px line at its foot.
  (seen in P3.9; D-117)
- **The window's tone shows around tabs.** Kate leaves a 2 px strip of tone
  1 above its tabs, and at a fractional scale a faint 1 px seam shows
  beside a dialog's first tab. (seen in P3.9; D-117)
- **A colour button's swatch has a sunken frame** 1 to 2 px wide, which
  the button draws itself. (seen in P3.9; D-117)
- **Kate's Manage Sessions buttons show a 1 px seam between them** at a
  fractional scale: Kate stacks them with no space. (seen in P3.9; D-117)
- **KWin dims the window behind a dialog**, which darkens and desaturates
  its tones towards a neutral near-black. It is KWin's dialog parent
  effect, a system setting. (seen in P2.3)
- **Konsole's scrolled-lines bar is a cool grey.** Beside lines that have
  just scrolled into view Konsole draws a bar about 3 px wide, ANSI blue at
  about 59 % over the terminal background: `#365363`, chroma 0.044, just
  short of a hue. Konsole mixes it itself. It can be turned off in the
  Konsole profile: Scrolling → Highlight scrolled lines. (seen in P4.1;
  D-120)
- **Kate shows a seam across the current line.** Kate draws a line 1 px
  wide between the gutter and the code. It takes the gutter's tone and
  vanishes, except across the current line, where the gutter is a tone
  lighter. The indentation lines and the word wrap marker, off by default,
  do the same. (seen in P4.2; D-124)
- **The window outline is uneven at a fractional scale.** At a scale such
  as 1.25, 1.49 or 1.5 it is 1 or 2 device pixels wide depending on the
  edge, and under Xwayland one edge of a window can lose it: Aurorae and
  KWin round it, and the theme's sizes are logical pixels. At scale 1, 1.75
  and 2 it is even. (seen in P5.1; D-126)
- **GTK applications that draw their own title bar**, such as zenity, keep
  their own rounded frame: Amber's window decoration does not reach them.
  (seen in P5.1; D-127)
- **A hovered or pressed window button shows a seam at the window
  outline.** Its fill stops one pixel short of the outline, so that the
  outline stays whole at a fractional scale: at scale 1 a 1 px strip of
  the title bar's tone shows between the two, and at 1.49 a dark blended
  row. (seen in P5.2; D-130)
- **Kate's caret is a cool grey.** Kate draws the text caret by inverting
  the pixels under it, so on the editor's warm tone it is `#dadde0`. The
  editor theme has no caret colour. (seen in P4.2; D-124)

## Licence

MIT. See [LICENSE](LICENSE).

The Union style in `parts/union-style/amber/` is a copy of KDE's Breeze
style and stays BSD-2-Clause, with its notices and its own `LICENSE`. The
rest of Amber is MIT.
