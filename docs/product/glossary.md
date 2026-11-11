# Amber — Glossary

> Status: **Accepted** on 2026-11-11

This glossary fixes the words used in Amber's documentation, code and
conversations. KDE uses "theme" and "style" for many different things, so where
a word has more than one common meaning the glossary picks one and lists the
words to avoid.

Terms are grouped by area and listed in a logical order, not alphabetically.

## Naming the product

**Amber**
: The product as a whole: every part, installed together. Also written "the
  Amber theme". _Avoid_ "the theme" for a single part.

**Part**
: One of the things Amber installs. There are five: the colour scheme, the Union
  style, the window decoration, the terminal colours and the editor theme. The
  prototype is not a part: it is never installed.

**Sand**
: The palette direction the owner chose from the first mockups: near-neutral
  stone surfaces with a muted gold accent. Sand names the palette; Amber names
  the product.

**Owner**
: The person Amber is made for, who decides what it should be. In documents,
  "decided" means the owner said so; "my call" means the designer or builder
  chose it and the owner may change it.

## The parts

**Colour scheme**
: The Plasma colour scheme file `Amber.colors`. It gives every Qt application
  its colours and is where the Union style reads its colours from. _Avoid_
  "palette" (that is the set of tokens) and "colour theme".

**Union style**
: The folder of CSS that tells Union how to draw widgets. Called the "style"
  for short. _Avoid_ "widget theme", "application style" (KDE's name for the
  setting) and "Plasma style" (KDE's name for the theme of the panel and
  desktop widgets, which Amber does not cover).

**Window decoration**
: The title bar, window buttons, frame, window outline, and window glow or
  shadow that KWin
  draws around a window. Called the "decoration" for short. Built as an
  Aurorae theme.

**Terminal colours**
: The Konsole colour scheme file `Amber.colorscheme`: background, foreground
  and the 16 ANSI colours. _Avoid_ plain "colour scheme" for this file.

**Editor theme**
: The KSyntaxHighlighting theme file used by Kate and KWrite: editor
  background, text and syntax colours.

## Beside the parts

**Prototype**
: The HTML and CSS pages that show Amber's look in a browser. It holds the
  tokens and is where a change is tried first.

**Candidate**
: A value shown in the prototype beside a starting value, with its measured
  contrast, for the owner to choose from. It is not a token until it is
  chosen.

**Known gap**
: A place where Amber cannot meet its own rules because the platform or an
  application prevents it. Known gaps are listed in the README.

## The platform

**Union**
: KDE's style engine. It reads a style and draws widgets for Qt Widgets and
  Qt Quick applications. Still in development upstream.

**Union CSS**
: The CSS dialect that Union reads. It looks like browser CSS but is not: it
  has its own states, properties and functions. _Avoid_ plain "CSS" when the
  difference matters; say "Union CSS" or "browser CSS".

**Breeze**
: KDE's default look. "Breeze style" means the Union style that ships with
  Plasma, which Amber's style starts from.

**Aurorae**
: KWin's engine for window decorations that are made of files, without
  compiled code.

## The look

**Token**
: A named value of the look, such as a colour or a size, written as a CSS
  custom property in the prototype's tokens file. Tokens are the single source
  for every part.

**Tone**
: One of the numbered steps of surface colour, from tone 0 (darkest) upwards.
  _Avoid_ "shade" and "grey".

**Surface**
: An area of a window filled with one tone: the title bar, a sidebar, the
  content area.

**Tonal separation**
: Telling two surfaces or widgets apart by a difference of tone alone, with
  no line between them.

**Well**
: A widget that sits darker than its surface, such as a text field.

**Well edge**
: A solid bar at least three pixels high at the foot of a well, in a tone
  lighter than the surface. A candidate cue for O-1. It is not a hairline.

**Raised widget**
: A widget that sits lighter than its surface, such as a button. It is not a
  3D effect.

**Round widget**
: A widget that is a circle by convention: a radio button, a round button.
  It stays a circle. It is not a rounded corner, which is the softened
  corner of a rectangle.

**Toggle**
: A check box or a radio button. A toggle button is a button, not a toggle.

**Track**
: The groove of a slider or a progress bar that the fill runs along.
  _Avoid_ "groove" and "trough".

**Fill**
: The accent part of a track, from its start to the value.

**Thumb**
: The part of a slider or a scrollbar that is dragged. _Avoid_ "handle"
  and "knob".

**Item**
: One entry of a list, tree or table view, or of a sidebar. In a table view
  an item is a whole row.

**Tab**
: One of the buttons of a tab bar. The selected tab names the page shown
  below it.

**Header**
: The row of column titles above a table or tree view. Each title is a
  header section, which may carry a sort arrow. _Avoid_ "column header" for
  the whole row.

**Popup**
: A small window that opens over a window and closes when it is done: a
  menu, a combo box's list, a tooltip. A dialog is a window, not a popup.

**Sample**
: A mock terminal or editor in the prototype, filled with realistic content,
  that shows the terminal colours or the editor theme.

**ANSI colour**
: One of the 16 colours a terminal program asks for by number: eight normal
  (black, red, green, yellow, blue, magenta, cyan, white) and eight bright.
  _Avoid_ "intense", Konsole's word for bright, except when naming Konsole's
  keys.

**Syntax colour**
: A colour of the editor theme that marks one kind of code, such as a
  keyword, a string or a comment.

**Gutter**
: The column beside an editor's text that holds the line numbers. _Avoid_
  "icon border" (Kate's name) and "margin".

**Current line**
: The line of an editor that holds the text cursor.

**Text selection**
: The run of text chosen in an editor or a text field. _Avoid_ "selected" for
  it: that is the state of an item or a tab.

**Accent**
: The one strong colour, a muted gold. It marks selection, checked state,
  progress and the primary button, and it tints the tone of a focused widget.

**Glow**
: A soft, blurred, coloured light around something. No widget in Amber has
  one: Union cannot draw it in Qt Widgets applications, and a widget's
  state is shown by tone. The one glow in Amber is the window glow.

**Window glow**
: The soft accent light that the window decoration draws around the active
  window. An inactive window has a shadow in its place.

**Shadow**
: A soft dark blur under a popup, menu or inactive window that adds depth.
  A shadow is dark and shows no state.

**Hairline**
: A line one pixel wide: a border, outline, separator or divider. Amber has
  none, with one exception: the window outline.

**Window outline**
: The thin line that the window decoration draws along every edge of a
  window, so that windows which overlap can be told apart. It is the only
  hairline in Amber, and it is square at the corners. Its width is not yet
  settled. _Avoid_ "window
  border" (KWin's name for the frame, whose width is a system setting) and
  plain "outline".

**Block marker**
: A solid accent rectangle at least three pixels wide on the leading edge of
  a selected item, or on the top edge of a selected tab. It is not a
  hairline.

## Widget states

The names follow Union CSS.

**At rest**
: No state applies.

**Hovered**
: The pointer is over the widget. _Avoid_ "hover state", "mouse-over".

**Focused**
: The widget has keyboard focus and shows it (Union CSS `:visual-focus`).
  _Avoid_ "active" and "selected" for this.

**Pressed**
: The widget is being clicked or held down.

**Checked**
: A check box, radio button or toggle button is on.

**Selected**
: An item of a list, sidebar or tab bar is the chosen one.

**Disabled**
: The widget cannot be used.

**Inactive**
: The window is not the one in use. Applies to windows and decorations, not
  to single widgets.

## Checks

**Contrast pair**
: A foreground token, the background tokens it appears on, and the minimum
  WCAG contrast ratio it must reach. Pairs are declared next to the tokens
  and checked by a tool.

**Close**
: A contrast pair that passes by less than 2 %. It is treated as a warning.

## Working on Amber

**Step**
: One stage of the roadmap, such as "Prototype".

**Plan**
: A small, written unit of work inside a step, with one result that can be
  tested. A step has several plans.

**Spike**
: A quick, throwaway experiment that answers one question about the platform.
  Its code is not kept; its finding is written down.

**Tool**
: A small command-line program in `tools/` written for the agent or the owner
  to compute, check or generate something.
