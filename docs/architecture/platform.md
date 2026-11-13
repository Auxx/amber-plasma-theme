# Amber — Platform

> Status: **Accepted** on 2026-11-11

What is known about the target system, and what is not. Every fact is marked
**verified** (seen on the owner's machine, with the date) or **unverified**.
Nothing is built on an unverified fact: a spike or a plan tests it first and
moves it to verified, with what was found.

Target: Fedora 45, KDE Plasma 6.8.2, Wayland session (verified, 2026-11-11).

## Union

Verified on 2026-11-10 unless marked.

- `plasma-union` 6.8.2 is installed and is the active widget style
  (`widgetStyle=Union` in `~/.config/kdeglobals`).
- Upstream calls it "In Development" and hides it in System Settings. Expect
  gaps, and expect changes between Plasma releases.
- Installed styles live in `/usr/share/union/styles/<id>/` as a
  `metadata.json` and `contents/css/`. Only `breeze` is listed by
  `union-styletool list`; `breeze-mobile` and `breeze-rtl` are hidden
  variants that import it.
- The Breeze style is about 3,000 lines of Union CSS in files per widget
  family: `variables.css`, `button.css`, `text.css`, `check.css`, `tabs.css`,
  `bars.css`, `delegate.css`, `tables.css`, `popup.css`, `application.css`,
  `kirigami.css`, `calendar.css`, `widgets.css` and `defaults.css`, joined
  by `style.css`; `check.css` loads three SVG files from
  `contents/images/`. One more file, `global.css`, declares the custom
  properties `--color-group` and `--color-set` but is imported by no file of
  the style. Its licence is BSD-2-Clause. (file list verified, 2026-11-12)
- **Union reads only the files `style.css` imports.** A rule appended to
  `global.css` (`button { background-color: #ff00ff; }`) changed nothing;
  the same rule in `button.css` turned the buttons magenta. (verified,
  2026-11-12, P3.2)
- **How the Breeze style shows focus in a Qt Widgets application.** Its
  `outline` is never drawn (see below), so focus shows only where a
  `:visual-focus` rule also changes something Union draws: the border of
  a push button, tool button, combo box, line edit, spin box and check box
  turns accent, 1 px. A radio button changes a few pixels of its ring, and a
  slider practically nothing. A text area and a list view show no focus
  except the text cursor. A tree or table view marked its current item with
  accent mixed over the view (`#584c38`), Breeze's `:active-focus` rule,
  which P3.7 replaced. Seen with the Amber colour scheme.
  (verified, 2026-11-12, P3.2)
- **What Union tells a button in a Qt Widgets application** (verified,
  2026-11-12, P3.3, by marker rules read in the probe's pixels):
  - `:highlighted` is given to every auto-default push button, not to the
    default one alone. In a `QDialog` every push button is auto-default, so
    every button of a dialog has it; outside a dialog none has. No other
    selector tried (`.default`, `[default="true"]`, `.auto-default`) told
    the default button apart. Qt moves the default to whichever push button
    has focus; nothing in Union's states follows it. Amber draws
    `:highlighted` as a plain button (D-100).
  - `:active-focus` is keyboard focus, shown or not; `:visual-focus` is
    focus shown by the keyboard. A window's first widget has active focus
    as soon as the window opens.
  - A tool button without auto-raise has the hint `raised`; one with
    auto-raise has none.
  - A combo box whose popup is open is `:checked`.
- **Which rule wins.** A hint counts: `toolbutton.raised` beats a later
  `toolbutton`. Between two rules that match equally, the later one wins:
  in `button { &:hovered {…} &:visual-focus {…} }` a hovered, focused
  button takes the second, and with the blocks swapped the first. So the
  order of state blocks gives precedence. (verified, 2026-11-12, P3.3)
- **A `padding` with two values is not read as browser CSS reads it.**
  `padding: 6px 12px` gave 12 px at the top and bottom and 6 px at the
  sides, both written as a value and through a variable. Amber's style sets
  each side alone. (verified, 2026-11-12, P3.3)
- **A button's height is its padding plus its content**; `height` is a
  minimum. With 6 px at the top and bottom, a push button and a text-only
  tool button are 30 px high at scale 1, as `sizeHint()` gives it; a
  combo box, whose arrow is 20 px high, needs 4 px. (verified, 2026-11-12,
  P3.3)
- **What Union reaches on a text field, spin box, text area and editable
  combo box in a Qt Widgets application** (verified, 2026-11-12, P3.4, by
  marker rules read in the probe's pixels and in Dolphin):
  - `textfield`, `spinbox` and `combobox.editable` take a background colour
    in every state, and a 3 px `border-bottom` under a focus state draws the
    focus bar along the whole foot. It does not move the text and does not
    change the widget's height.
  - `:visual-focus` is keyboard focus only: a clicked field has
    `:active-focus` alone. Amber's wells show focus under both (D-103).
  - A text area (`QTextEdit`, `QPlainTextEdit`) is a frame, matched as
    `textarea[shape="panel"]`, around a viewport that the palette fills
    with the View set's background, tone 2. No rule reaches the viewport:
    `textarea`, `scrollview`, `frame`, `textedit` and `scrollview >
    viewport` all failed. The frame is 0 px wide unless it has a border,
    and a border is drawn only if it is there at rest: one set only under
    a focus state is not drawn, though its colour may change with the
    state. A text area is a known gap (D-104).
  - A spin box has the hint `constrained`; its two steps are stacked at
    the right, as in the prototype, and its height comes from the two
    steps (16 px each by default, 15 px in Amber). No rule reaches the
    steps (`spinbox > indicator`, `.increase`, `spinbox.constrained >
    indicator` or a bare `indicator`): Qt draws the arrows in the text
    colour, with no hovered or pressed tone. A known gap (D-104).
  - An editable combo box's arrow takes the `combobox > indicator` rule;
    `combobox.editable > indicator` changed nothing.
  - The text, the placeholder and the text selection are drawn by Qt from
    the palette, not from Union's `color`: a placeholder is `#a9a297`
    (dim text), a disabled text `#a6a19a` and a disabled placeholder
    `#7c766e`, both from the colour scheme's disabled effect (D-91), and a
    text selection from the Selection set: since P3.7 the dark gold
    `text-selection` with text (D-110). `textfield > .placeholder`
    does not reach a Qt Widgets field. No Union property names the
    cursor, the caret, the selection or the placeholder.
  - A line of text is 20 px high, so a text field is 30 px with 5 px above
    and below it.
  - A later rule of another file wins: Breeze's `application.css`, imported
    after `text.css`, gave `textfield` and `textarea` a `:visual-focus`
    rule of its own, which took the bar away until P3.4 took them out of it.
- **What Union reaches on a check box, radio button, slider and progress
  bar in a Qt Widgets application** (verified, 2026-11-12, P3.5, by marker
  rules read in the probe's pixels and in Dolphin):
  - `checkbox > indicator` and `radiobutton > indicator` take a background
    in every state: at rest, `:hovered`, `:visual-focus`, `:checked` and
    its combinations, `:disabled`, and `checkbox.indeterminate` for a
    partly checked box. Hovering the label hovers the box: Qt has one
    widget. The box is 16 × 16 px; the label is `spacing` away from it.
  - A disabled label takes Union's `color`, unlike a text field's text.
  - A mark is `background-image: url(…) mask <colour>`, drawn at the box's
    origin at the SVG's own size, so a 16 × 16 SVG places it as the
    prototype does. A checked, disabled mark takes
    `background-image-mask-color`, not the colour after `mask`.
  - A slider's own background is its track, `> fill` the fill and
    `> handle` the thumb; `.horizontal > handle` sets the thumb's size.
    `slider:hovered > handle` and `slider > handle:hovered` both match
    when the pointer is anywhere over the slider. Pressed is reached by a
    mouse press on the thumb, not by `setSliderDown()`, and `:pressed`
    then matches the slider as well as the thumb. `> tickmark` is a tick
    mark, `.active` below the value; Union draws 9 of 11 on a 200 px
    slider, none at the ends or under the thumb (D-107).
  - A progress bar's own background is its track and `> track` its fill;
    `> chunk` is never drawn. `inset: 0px` and `padding: 0px` make the
    track the widget's width. The text takes Union's `color`, and
    `color: transparent` hides it. A busy bar (`setRange(0, 0)`) is drawn
    as a full fill, with no block and no hint that tells it apart (D-107).
  - Dolphin 25 shows no zoom slider in its status bar; its free-space bar
    is its own painting, and a copy's progress goes to the notification
    service.
- **What Union reaches on toolbars, the menu bar, the status bar, tabs and
  scrollbars in a Qt Widgets application** (verified, 2026-11-12, P3.6, by
  marker rules read in the probe's pixels, in Dolphin and in Kate):
  - Every toolbar in the top area of a main window has the hint `.header`,
    one in the bottom area `.footer`, and a toolbar outside a main window
    neither. `toolbar > separator` draws nothing: Qt draws a separator with
    the `toolbar > handle` rule, the grip's, 6 px wide whatever `width`
    says. A grip with no fill removes both.
  - `menubar` and `menubaritem` take a background and `color`. A hovered
    title is `:highlighted` (Qt's current action), with or without
    `:hovered`; an open one is `:pressed`. Union's
    `SH_MenuBar_AltKeyNavigation` is 0, so Alt alone highlights no title.
    A title whose action is disabled gets no `:disabled`: it is drawn as at
    rest.
  - `statusbar` takes a background, but its `color` reaches neither a label
    nor a `showMessage` text: Qt draws both from the colour scheme, in
    text. Union has no element for a label.
  - Union draws no `tabbar` background, in a `QTabBar` or a `QTabWidget`:
    past the last tab the bar shows its parent, the Window set's tone 1 in
    Dolphin and Kate. `tabwidget` takes a background, the page's. A tab is
    `tabbutton`: `:hovered`, `:checked` when selected (not
    `:highlighted`), `:checked:visual-focus` when its bar has keyboard focus
    (focus is always on the current tab), `:disabled`. `[direction]`
    follows the bar's shape. A `border-<edge>` of 3 px set at rest and
    recoloured under `:checked` draws on that edge in every direction; the
    background is not drawn under it, so each state colours the border with
    its fill. `> closebutton` takes a background and `color` in each state.
  - A scrollbar is `scrollbar` (its track) and `> handle` (its thumb).
    `width: 12px` with each padding side 0 gives a 12 px bar whose thumb is
    12 px across; no arrow buttons are drawn. `scrollbar:hovered > handle`
    and `scrollbar > handle:hovered` both match whenever the pointer is over
    the bar, on the track too. Pressed is reached by a mouse press on the
    thumb. `:disabled` reaches the bar and the thumb. `scrollareacorner`
    takes a background. Behind a clear track lies the window, not the view:
    in Dolphin no `frame`, `scrollview` or `listview` rule reached it, so
    the track shows tone 1 beside a tone 2 view.
  - In the probe, the window (1280 × 772) is smaller than its grid, so rows
    overlap and `render()` cuts a widget where a lower row's widget begins.
- **What Union reaches on the items of views and on headers in a Qt Widgets
  application** (verified, 2026-11-12, P3.7, by marker rules read in the
  probe's pixels, in Dolphin and in Kate):
  - Every item is `itemviewitem`. A `QListView`'s items, Dolphin's Places
    and a settings dialog's page list included, are `.inside-list`, with
    `.hover-enabled` only when the view tracks the mouse; a `QTableView`'s
    are `.inside-table`; a `QTreeView`'s have neither. Table and tree
    items are one per cell, with `[position]` `beginning`, `middle` or
    `end`. Dolphin's files are `graphicsview itemviewitem`. No ancestor
    selector (`dockwidget`, `listview`, `scrollarea`) and no `:not()`
    reached an item, so a sidebar cannot be told from any other list.
  - Selected is `:highlighted` (`.selected` never matched); hovered is
    `:hovered`; any focus is `:active-focus`, focus from the
    keyboard alone `:visual-focus`, and a click gives `:active-focus`
    without it. A table colours only the hovered cell, and a table or tree
    only the focused cell, not the row. A press selects at once. Qt never
    draws a disabled item as selected.
  - `height` reaches an item (26 px); padding does not: Union draws an item's
    text from its edge, as it did with Breeze. A 3 px border set at rest is
    drawn on every cell, with no fill under it.
  - A tree's cells start after its indentation: the indented area and the
    chevron are never filled. `treeviewdelegate > indicator` colours the
    chevron; no branch lines are drawn.
  - A header section is `headerviewdelegate`, with `:hovered`,
    `.sort-ascending`, `.sort-descending` and `:disabled`; `:pressed` was not
    reached by `render()`. A clear section shows the header's Button tone 3.
    Past the last section the header shows the window's tone 1, and no rule
    (`header`) reached it. No line divides or underlines sections.
  - A `QTableView`'s grid is drawn by Qt from `SH_Table_GridLineColor`, the
    palette's Mid, which KDE derives from the Button set: no rule reached it.
  - No `listview`, `treeview`, `tableview`, `columnview`, `scrollview` or
    `graphicsview` background reached a view; a view keeps the View set.
  - `rubberband` takes a background on a `QRubberBand`, including a colour
    from `modify-color(… set-alpha …)`.
  - Dolphin and a settings dialog's page list paint a selected item's text
    from the colour scheme's Selection foreground, whatever Union's `color`
    says. Breeze's folder icons are drawn in `ColorScheme-Accent`, which
    is the Selection background: Plasma's `AccentColor` and the Selection
    set's `BackgroundAlternate` changed nothing.
  - Union has no selector for a right-to-left layout; Breeze ships a
    separate `breeze-rtl` style for it, and how an application chooses it
    is unverified. A single `QListView` turned right-to-left drew no text,
    with Breeze too.
- **What Union reaches on menus, combo box lists, tooltips and dialogs in a
  Qt Widgets application** (verified, 2026-11-13, P3.8, by marker rules read
  on screen in the probe `popups.py`, in Dolphin and in Kate):
  - `menu` takes a background, opaque, and `padding-*`; `margin` changes
    nothing. Breeze's menu was the Window set, tone 1, the tone of a
    dialog's body, so a menu over a dialog looked see-through: it was not.
  - A `menuitem` is `:hovered` under the pointer and `:highlighted` under
    the pointer or the keyboard; a keyboard highlight is never
    `:visual-focus`. An item whose submenu is open stays `:highlighted`.
    `:pressed`, `:checked`, `:disabled`, `.with-submenu`, `height`,
    `padding-*` and `inset` reach it, and `shortcuttext` and `arrow` are
    drawn by Union. `shortcuttext` takes its own `color`; a submenu arrow
    takes the item's `color` or `icon-color`, which colour the item's own
    icon too, and no rule on `arrow` or `indicatorarrowright` reaches it.
    (verified, 2026-11-13, P3.8, in `render()`)
  - A checkable item's mark is `menuitem > indicator`, but an item with an
    icon, and a disabled one, draw it as a `checkbox` or `radiobutton`
    inside `menu`: only `menu checkbox …` and `menu radiobutton …` reach
    it, and the toggles' box shows there unless they clear it.
  - A label starts after the item's icon when it has one, and at the
    item's padding when it has none, so labels of one menu need not line
    up (a known gap, D-115).
  - A `menuseparator` is as high as its `height` and its `inset`:
    `height: 0px; inset: 4px` is an 8 px gap that draws nothing. Set alone,
    `inset-top` and `inset-bottom` added nothing to a plain separator (0 px
    high). Breeze's drew a 1 px line. `.with-title` (`QMenu::addSection`)
    takes background, `color`, `height`, `padding-*` and `font-weight`; it
    inherits the separator's `inset`, whose sides push its title 4 px past
    the labels unless its own `inset-*` are 0, and its top padding is a gap
    above its title.
  - **No `box-shadow` is drawn under a popup**: not on `menu`, `popup` or
    `tooltip`, under Wayland or X11, and KWin draws none of its own.
  - **A combo box's list is a clear window that no rule fills** (`popup`,
    `popup.combobox`, `menu`, `listview`, `panel`, `scrollarea`, `frame`
    tried). Its items are `popup.combobox itemviewitem`, the current value
    `:highlighted`. The Breeze style's item inset, and a clear item, showed
    the window behind: the list looked transparent. Each item must paint
    its own fill. Side padding does not move an item's text and an inset
    clears its fill; `spacing` moves the text, and 8 px puts it where the
    combo box's own text starts. At a fractional scale an item's edge
    falls mid-pixel and showed the window behind as a seam; a fill 1 px
    past the edge (`inset: -1px`) closes it. `height` reaches the item.
  - `tooltip` takes `background-color` and `border-radius`. Its text is the
    colour scheme's Tooltip foreground, and Qt sizes it itself: `padding`
    and `width` do not reach it (a known gap, D-115).
  - `dialog`, `dialogbuttonbox` and `overlay` reach nothing in a `QDialog`,
    `QMessageBox` or a settings dialog: their body is the Window set, tone
    1, and nothing draws a line above their buttons.
  - A message (`KMessageWidget`, Dolphin's "does not exist") draws itself:
    square, the negative background `#422223`, and a 1 px line of
    `#b83d48` at its foot that no Union rule reaches (a known gap, D-115).
- **What the sweep of Dolphin, Kate and Konsole found** (verified,
  2026-11-13, P3.9, by `image greys` and `image lines` over every window and
  by marker rules, under Xwayland at the scale 1.4916667):
  - **A main window's dock separator is `splitter`**, as a `QSplitter`'s
    `QSplitterHandle` is. At 1 px, clear, it showed the window's tone 1 as a line
    beside a dock and between two views. At 0 px Dolphin's split view still
    drags but a dock separator does not; at 4 px both do.
  - **At a fractional scale an edge that falls mid-pixel shows what lies
    behind it as a 1 px seam**: under the header toolbar, between menu
    titles (`menubaritem` was clear), under and between header sections,
    and between an item and a scrollbar. A fill 1 px past the edge
    (`inset-*: -1px`) closes each. On a tab it also moves a west tab's
    block marker 1 px outward and lays a selected tab over its neighbour,
    so a tab's own edge is left (a known gap, D-117).
  - Union's line frames (`QFrame::HLine`, `KSeparator`) draw nothing: the
    Properties dialog and the settings pages showed gaps, no lines.
  - **`KMessageWidget` does not read the colour scheme's status colours.**
    Konsole's warning ("output suspended") is Breeze's orange `#f67400`
    (246, 116, 0) as a frame 2 px wide on every side, over `#4d351f`, where
    the colour scheme's neutral is `#d1b072`. Kate's information message
    ("modified on disk") is blue, `#223741`, with a 1 px `#3794c5` line at
    its foot. No rule reaches either (a known gap, D-117). No application
    showed a positive message.
  - `KColorButton` draws a sunken frame 1–2 px around its swatch itself,
    and `KExtendableItemDelegate` (the shortcuts editor) draws its own
    extender arrow in each cell, as under Breeze.
  - Under Xwayland a submenu met its menu with a 1 px seam (two windows
    placed at whole pixels); the owner saw nothing amiss under Wayland.
- The only input format is CSS (`union-input-css`).
- `union-styletool install <folder>` copies the folder to
  `~/.local/share/union/styles/<id>/`. The identifier is the folder's name;
  `metadata.json` has no identifier field. Nothing else is written, and no
  setting is changed. (verified, 2026-11-11)
- `union-styletool uninstall <id>` removes the style's folder but leaves the
  empty folders `~/.local/share/union/styles/` and `~/.local/share/union/`
  when they held nothing else. (verified, 2026-11-11)
- Union keeps one compiled cache file per style in `~/.cache/union/`, named
  by a hash. Uninstalling a style does not remove its cache file.
  (verified, 2026-11-11)
- Dolphin, Kate and Konsole are Qt Widgets applications and are drawn through
  `UnionWidgetsStyle.so`. Qt Quick applications use the same style through
  `org.kde.union`.
- **The two do not draw the same properties.** In 6.8.2, on a button in a
  Qt Widgets application, `box-shadow` and `outline` are matched but no
  pixel of either is drawn; background, border and corners are. Qt Quick
  draws all of them. Only buttons were tried. (verified, 2026-11-11; see
  [P0.3](#p03-widget-glow--2026-11-11))
- A Qt Widgets application reports its style as class `UnionStyle`, name
  `union`. A PySide6 script (`python3-pyside6` 6.11.2 is installed) is drawn
  by Union like any other application, which makes it a quick test
  application. (verified, 2026-11-11)

### Union CSS

- States: `:hovered`, `:visual-focus`, `:checked`, `:disabled`, and others
  used in the Breeze style.
- Properties: every supported property is listed in
  `/usr/share/union/css/defaults/generated-properties.css`. They include
  `border`, `border-radius` per corner, `outline`, `box-shadow`, `padding`,
  `spacing`, and layout and icon properties of Union's own.
- **`box-shadow` is `none` or exactly one shadow**: four lengths and a
  colour. There is no `inset`, and shadows cannot be stacked. The lengths are
  horizontal offset, vertical offset, blur and spread. (verified, 2026-11-11)
- In a Qt Widgets application, on a button (verified, 2026-11-11; see
  [P0.5](#p05-glow-without-a-shadow--2026-11-11)):
  - `inset` (the layout property) draws the background that far inside the
    widget. The widget does not grow, and `padding` is still counted from
    the widget's edge. A negative `inset` draws nothing outside the widget.
  - `margin` changed nothing that could be seen.
  - A border is drawn around the inset background, on the surface, and its
    colour may be part transparent.
  - `background-image` works only as `url(…) mask <colour>` with an SVG
    file. Without `mask` the application aborts in
    `drawBackgroundRectangle`. A PNG file is not drawn.
  - A masked image is drawn over the background colour at the image's own
    size, centred, and cut at the widget's edge. It is not stretched or
    tiled. `background-image-width`, `-height` and `-offset-*` changed
    nothing.
  - The mask is on or off per pixel: a gradient and a blur filter in the SVG
    both came out as solid shapes. The mask colour may be part transparent,
    but only as one flat value.
  - `:hovered` and `:visual-focus` rules on `background-color` and
    `border-color` are drawn.
- `border: none`, `border-radius: 0px` and `outline: none` are accepted and
  give a square widget with no border in both Qt Widgets and Qt Quick.
  (verified, 2026-11-11) Amber's style uses them on every widget but the
  round ones, and every widget the P3.2 probe draws comes out square with no
  line. (verified, 2026-11-12, P3.2)
- Functions: `custom-color("kcolorscheme", …)` reads a colour of the active
  colour scheme; `mix()` and `modify-color()` derive colours; `var()` reads
  a custom property.
- Nesting with `&` works. Media queries do not, according to a comment in the
  `breeze-mobile` style.
- The Breeze style sets `--corner-radius: 5px` in `variables.css` and uses it
  throughout, and draws borders with `1px solid` variables per widget family.
- Manual: <https://api.kde.org/union-index.html>.

### Tools and switches

- `union-styletool`: `create`, `install <path>`, `update`, `uninstall`,
  `list`, `inspect`, `package`.
- `union-ruleinspector`: shows which rules match a widget given its type,
  states and hints. Its `--style` option had no effect: it showed the Breeze
  style's values. With `UNION_STYLE_NAME=<id>` set it shows the named
  style's. (verified, 2026-11-11)
- `UNION_STYLE_NAME=<id>` in the environment of one application makes that
  application use a style installed for the user, in Qt Widgets and in
  Qt Quick. Other applications and the system setting are not touched.
  (verified, 2026-11-11)
- To see an edit: `union-styletool update --force <folder>`, then start the
  application again. Without `--force` the update is refused unless the
  version in `metadata.json` went up. The cache is rebuilt by itself;
  `UNION_FORCE_RECREATE_STYLE_CACHE` was not needed. (verified, 2026-11-11)
- **A style is found in `union/styles/<id>/` of a folder put first in
  `XDG_DATA_DIRS`**, not only where `union-styletool install` puts it. A
  symbolic link to the folder works. So a style can be tried without
  installing anything: put a folder holding `union/styles/amber` → the
  repository's `parts/union-style/amber/` first in `XDG_DATA_DIRS`, and start
  the application with `UNION_STYLE_NAME=amber`. `union-styletool list` then
  lists it too. After an edit of the linked folder, starting the application
  again is enough: Union rebuilt the style's cache file in `XDG_CACHE_HOME`
  by itself, with no `update` and no `--force`. Whether `XDG_DATA_HOME` is
  read as well was not tried. (verified, 2026-11-12, P3.1)
- **Amber's Union style is tried in P2.3's nested session**
  (`tmp/check-colour-scheme/`, see [Colour scheme](#colour-scheme)), whose
  data folder holds that link: `UNION_STYLE_NAME=amber in.sh dolphin`. Its
  own D-Bus also keeps a single-instance application such as Dolphin from
  handing its window to a process started without the variable. In P3.1,
  Dolphin's settings dialog drawn with the unchanged copy matched Breeze to
  the pixel, and a copy with one added rule, `button { background-color:
  #ff00ff; }`, made its enabled push buttons magenta; a disabled button kept
  Breeze's colour, as its `:disabled` rule comes later. (verified,
  2026-11-12)
- A style folder may hold files Union does not read: a `LICENSE` beside
  `metadata.json` is accepted. (verified, 2026-11-12)
- **A widget can be checked alone, at scale 1, without a screenshot.** In a
  PySide6 script run in the nested session, `QWidget.render()` into a
  `QImage` with `setDevicePixelRatio(1)` is drawn by Union at scale 1,
  whatever the output's scale. Pre-filled with magenta `#ff00ff`, a colour
  no widget uses, the picture can be read by `image frame --surface
  '#ff00ff'` for rounded corners and lines. States reach `render()` this
  way: hovered with `WA_Hover` and `WA_UnderMouse`, pressed with
  `setDown(True)`, checked with `setChecked(True)`, disabled with
  `setEnabled(False)`. Focused needs `setFocus(Qt.TabFocusReason)` **and
  then** `WA_KeyboardFocusChange` on the window; set only when the window is
  made, it is cleared and `:visual-focus` never applies. Under Breeze, a
  focused list view, a pressed slider and a hovered text area drew the same
  as at rest. The probe is P3.2's `tmp/check-colour-scheme/widgets.py`.
  (verified, 2026-11-12)
- **A popup cannot be opened from a script in the nested session.**
  `QMenu.popup()` without an input event shows nothing on Wayland, and
  `pyatspi`'s `ShowMenu` on Dolphin's and Konsole's toolbar menu buttons
  did nothing; their menu bars are hidden in this session. A menu was
  checked through `render()` only. (verified, 2026-11-12, P3.2) In P3.3, `ShowMenu` on a combo box
  in Dolphin's settings dialog opened its popup once, right after the owner
  had clicked in the session, and never again from a script; nor did
  `QComboBox.showPopup()` in the probe. A pressed combo box is not reached
  in `render()` either. (verified, 2026-11-12, P3.3) A tooltip does open on
  Wayland (`QToolTip.showText`), and a click by hand opens any popup.
  (verified, 2026-11-13, P3.8)
- **Popups open from a script under Xwayland.** Started with
  `KWIN_EXTRA=--xwayland run.sh`, the nested session runs an Xwayland, and
  an application run there with `in-x11.sh` (`QT_QPA_PLATFORM=xcb`) opens
  menus and combo box lists from `QMenu.popup()` and from QTest key and
  mouse clicks, since X11 needs no input serial; `pyatspi`'s `ShowMenu`
  then opens Dolphin's and Kate's menus too. `pop-shot.sh` shoots one popup
  of the probe `popups.py`. X11 coordinates are logical; the shot is at the
  Xwayland scale, 1.4916667. Pointer input sent through XTest asks the
  session's Remote Control portal first. (verified, 2026-11-13, P3.8)
- **Under Xwayland at a fractional scale an open menu shifts** a little
  down and to the left as the pointer moves over it, as the owner saw in
  Kate's Help menu; under Wayland it stays put. It is an X11 fault, and
  irrelevant to Amber: KDE no longer supports X11 (decided, D-115). Popups
  are judged by eye under Wayland. (verified, 2026-11-13, P3.8)
- Environment variables found in the Union libraries: `UNION_STYLE_NAME`,
  `UNION_DISABLE_STYLE_CACHE`, `UNION_FORCE_RECREATE_STYLE_CACHE`,
  `UNION_FORCE_PLATFORM`, `UNION_DISABLE_INPUT_PLUGINS`.
- A `unionStyle` configuration key was reported in the Union library by the
  design reviewer. **Unverified.**

### Unverified

| Question | Tested in |
|---|---|
| Which key selects the style for the whole system? | P6.2 |

The glow cannot be drawn in Qt Widgets applications (P0.3, P0.5). The owner
decided on 2026-11-11 that Amber has none: D-4 in the
[decisions](decisions.md).

## Window decoration

Verified on 2026-11-11 unless marked; see
[P0.4](#p04-square-decoration--2026-11-11).

- KWin draws the decoration; Union does not. (verified, 2026-11-10)
- `aurorae` 6.8.2 is installed. No Aurorae theme is installed for the
  system or for the user: `~/.local/share/aurorae/themes/` exists and is
  empty.
- **An Aurorae theme can draw a square title bar with no line on any edge**,
  for active, inactive, maximised and restored windows, at scale 1 and at
  the owner's 1.49. It needs KWin's window border size set to "No borders";
  see "The side and bottom borders" below.
- **An Aurorae theme can draw a window outline 1 px wide in a colour of its
  own.** The edge and corner elements of the frame are made 1 px thick in
  the window outline's colour, the centre element in the title bar's colour, and
  the theme's left, right and bottom borders are set to 1. At the top the
  window outline is drawn inside the title bar, in its first row. What shows on
  the other three edges depends on KWin's border size:
  - "Tiny": the window outline alone, 1 px on every edge at scale 1. At scale 1.49
    it is 2 device pixels on the top, left and bottom and 1 on the right.
  - the default: the window outline, then a band 3 px wide in the title bar's
    colour between it and the content.
  - "No borders": no window outline on the left, right and bottom.
- **The side and bottom borders belong to KWin's border size setting, not to
  the theme.** With the setting left at its default, a theme whose borders
  are 0 still gets a border 4 px wide, in the frame's colour, on the left,
  right and bottom. A negative border in the theme does not remove it.
  "Tiny" gives 1 px on all three, and "No side borders" leaves 1 px at
  the bottom: both are hairlines. Only "No borders" gives none. The setting is `BorderSize` with
  `BorderSizeAuto=false` in `[org.kde.kdecoration2]` of `kwinrc`; the owner
  sets it in System Settings → Window Decorations. The names here are for
  the values `Tiny`, `NoSides` and `None` that were written to the nested
  KWin's `kwinrc`; the default is `BorderSizeAuto=true`, which gave the
  same as `Normal`. The labels System Settings shows for them were not
  looked at.
- A theme is a folder `<id>/` in `~/.local/share/aurorae/themes/` holding
  `decoration.svg`, `<id>rc`, `metadata.desktop` and one SVG file per window
  button (`close.svg`, `minimize.svg`, `maximize.svg`, `restore.svg` and
  others). A button with no file is not shown. The format is described at
  <https://develop.kde.org/docs/plasma/aurorae/>.
- `decoration.svg` holds a frame of nine elements named
  `decoration-<side>` (`topleft`, `top`, `topright`, `left`, `center`,
  `right`, `bottomleft`, `bottom`, `bottomright`) and the same again as
  `decoration-inactive-<side>`. Plain rectangles of one colour, each 4 px
  thick at the edges, left no seam between the pieces at either scale.
  The elements for maximised windows, the inner border and the mask were
  left out, and nothing was missed.
- In the `rc` file, `[Layout]` sets `TitleHeight`, `ButtonWidth`,
  `ButtonHeight`, the `TitleEdge*` and `Padding*` values and the borders;
  `[General]` sets `ActiveTextColor`, `InactiveTextColor`,
  `TitleAlignment`, `Animation` and `Shadow`. The title bar's colour comes
  from the SVG, not from the colour scheme.
- Which window buttons show, and on which side, is KWin's setting
  (`ButtonsOnLeft`, `ButtonsOnRight` in the same group of `kwinrc`). The
  theme's empty `LeftButtons` did not remove the menu button on the left.
- A window with an empty title shows its application's name in the title
  bar.
- KWin selects an Aurorae theme with `library=org.kde.kwin.aurorae` and
  `theme=__aurorae__svg__<id>` in `[org.kde.kdecoration2]` of `kwinrc`.
- A changed theme shows as soon as KWin starts again; no cache had to be
  emptied.
- **A decoration can be tried without changing a system setting**, in a
  nested KWin with its own configuration, cache and D-Bus session:
  `XDG_CONFIG_HOME=<folder> XDG_CACHE_HOME=<folder> dbus-run-session --
  kwin_wayland --socket <name> --no-lockscreen --no-global-shortcuts
  --no-kactivities --width 900 --height 600 --exit-with-session <script>`.
  It opens as a window in the owner's session and reads its own `kwinrc`
  from that folder. The owner's `kwinrc` and `kdeglobals` were the same,
  byte for byte, afterwards.
  - Its scale is that of the display it opens on (1.49 here); `--scale`
    changed nothing. With `--virtual` it draws to no window at scale 1.
  - With `KWIN_SCREENSHOT_NO_PERMISSION_CHECKS=1` in its environment,
    `spectacle --background --fullscreen --nonotify --output <file>`, run
    inside it, saves a picture of its output.

- **An Aurorae theme draws its own shadow, as part of the frame's SVG.**
  The `rc` file's `PaddingLeft`, `PaddingTop`, `PaddingRight` and
  `PaddingBottom` keep that much room around the window, and the frame's
  edge and corner elements, made as thick as the padding, are drawn into
  it. What they hold is the shadow: a linear gradient from a
  part-transparent colour to nothing on an edge, a radial one on a corner.
  The window's own corners stay square. (verified, 2026-11-11; see
  [P0.6](#p06-window-shadow-and-glow--2026-11-11))
  - Width, strength and colour are whatever the SVG says, and each side may
    have a padding of its own, so a shadow can be deeper below a window
    than above it.
  - A `feGaussianBlur` filter inside one element is drawn too. Each element
    is drawn by itself, so a blur cannot run from one element into the
    next; gradients do not have that limit.
  - The colour may be any colour. In accent it is a glow around the window.
  - `decoration-inactive-*` elements may hold another shadow, so an active
    window can look different from an inactive one.
  - The shadow or glow falls on whatever is behind the window, other
    windows included.
  - A maximised window shows no shadow, no glow and no window outline, and
    fills the output.
  - The window outline is the innermost pixel of the same edge elements.
    At scale 1 it is one sharp pixel between the glow and the window. At
    scale 1.49 it is one full pixel and one blended pixel, and the pixel of
    the glow next to it is a little darker than its neighbours.
- Breeze's decoration, for comparison, draws a dark shadow that reaches
  more than 55 device pixels from the window at scale 1.49 and is deeper
  below the window than above it.

### Unverified

| Question | Tested in |
|---|---|
| Can the window outline be made the same width on every edge at scale 1.49? | P5.1 |
| What does `Shadow=false` in the `rc` file change? P0.6 only ran with `Shadow=true`. | P5.3 |
| Does Aurorae draw a gradient of many stops whose start lies inside the window, so that a shadow or glow fades on a curve and is deeper below a window than above it? An Aurorae copy of Breeze's shadow does it this way (nclarius, Plasma-window-decorations, `ActiveAccentDawn/decoration.svg`, read on 2026-11-12: 13 stops over 71 px for the active window and 36 px for an inactive one, starting 27 px inside the window at the top, 17 px at the sides and 4 px at the foot), but it was not run on this machine. The prototype draws the window glow and the shadow this way since P1.7 (D-59 to D-61). | P5.3 |
| Is there a line at the edge of a tiled window? | P5.3 |
| Can the theme choose the border size, so that the owner need not set it by hand? Breeze's decoration recommends a border size to KWin; nothing like it was found for an Aurorae theme. | P5.1 |

A compiled decoration, or Breeze's own decoration, is not used without the
owner's say. (my call)

## Colour scheme

- No user colour schemes exist yet: `~/.local/share/color-schemes/` is empty.
  The active global theme is Fedora's dark Breeze variant. (verified,
  2026-11-10)
- A `.colors` file has seven colour sets, `View`, `Window`, `Button`,
  `Selection`, `Tooltip`, `Complementary` and `Header`, and Breeze Dark adds
  `Header][Inactive`. Each set has the same 12 roles: `BackgroundNormal`,
  `BackgroundAlternate`, `ForegroundNormal`, `ForegroundInactive`,
  `ForegroundActive`, `ForegroundLink`, `ForegroundVisited`,
  `ForegroundNegative`, `ForegroundNeutral`, `ForegroundPositive`,
  `DecorationFocus`, `DecorationHover`. The other groups are
  `ColorEffects:Disabled`, `ColorEffects:Inactive`, `General`, `KDE` and
  `WM`. Seen in the strings of `libKF6ColorScheme.so.6` (kf6-kcolorscheme
  6.31.0) and in `/usr/share/color-schemes/BreezeDark.colors`
  (plasma-workspace 6.8.2). (verified, 2026-11-12, P2.1)
- The Breeze Union style reads the scheme as
  `custom-color("kcolorscheme", <state>, <set>, <role>…)`, with the states
  `active`, `inactive` and `disabled`, and also reads roles KColorScheme
  derives, such as `decoration frame` and `background positive`.
  (verified, 2026-11-12, P2.1)

Verified on 2026-11-12 in P2.3 unless marked, with `Amber.colors` of that
day, in Dolphin, Kate and Konsole under the Breeze Union style:

- **A colour scheme can be tried without changing a system setting** in a
  nested KWin (as in [Window decoration](#window-decoration)) whose
  applications run with their own `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`,
  `XDG_DATA_HOME` and `XDG_STATE_HOME`, and with a folder holding
  `color-schemes/Amber.colors` put first in `XDG_DATA_DIRS`. The folder of
  `XDG_CONFIG_HOME` holds a `kdeglobals` made as applying a scheme makes it:
  every group of the `.colors` file, plus `widgetStyle=Union` in `[KDE]`.
  Isolating `XDG_CONFIG_HOME` alone is not enough: Dolphin then still
  writes `~/.local/state/dolphinstaterc`.
  - The nested session reads `fontconfig` from that folder too, so text is
    drawn with Fedora's default subpixel anti-aliasing unless the folder
    says otherwise. For pixel checks it was set to greyscale (`rgba` none),
    since subpixel fringes are coloured whatever the scheme.
  - The applications can be driven through AT-SPI: start
    `/usr/libexec/at-spi-bus-launcher --launch-immediately` and
    `/usr/libexec/at-spi2-registryd` inside the session (D-Bus cannot start
    them there), run the applications with
    `QT_LINUX_ACCESSIBILITY_ALWAYS_ON=1`, and press menu items and buttons
    with `pyatspi` (`python3-pyatspi` 2.58.2 is installed). Kate's menus
    did not open this way; Dolphin's and Konsole's did.
  - The decoration reads its colours when the nested KWin starts, not
    while it runs.
- **Each application can be given a colour scheme of its own.** Dolphin's
  Settings → Window Color Scheme, and Kate's and Konsole's Settings →
  Window Colour Scheme, list every scheme in `color-schemes/` of the data
  folders, Amber among them. Choosing one repaints the open window at once
  and writes `ColorScheme=<name>` in `[UiSettings]` of the application's own
  `dolphinrc`, `katerc` or `konsolerc`; `kdeglobals` is not touched. A large
  icon already drawn, such as Dolphin's information panel, keeps its old
  colours until it is drawn again.
- **`ContrastEffect=1` is a channel-wise mix in sRGB** towards the
  background by `ContrastAmount`: with 0.34, disabled text is `#a6a19a`, in
  the palette and in pixels, which is `text` mixed towards tone 2 by 0.34
  to the unit. It measures 6.17:1 on tone 2.
- **`contrast=0` does not flatten Qt's bevel roles.** Against Button
  `#312e29` they are Light `#34302c`, Midlight `#2d2a26`, Mid `#221f1c`,
  Dark `#1a1816` and Shadow `#131110`: all warm. None was seen in the three
  applications as a grey.
- **`frameContrast` is read from `[KDE]`.** With 0 the derived frame colour
  equals the set's background: the Breeze style's 1 px border under the
  header toolbar is tone 0, the Header background; with 0.2 it is a lighter
  line (`#353330`).
- **`AccentColor` in `[General]` of `kdeglobals` is not applied by the
  applications**: with a blue accent written there, Dolphin's selection stayed
  `accent`. Plasma's colour settings page applies an accent by rewriting the
  colour groups of `kdeglobals`, which was not tried, since it changes a
  system setting. (unverified; P6.2 tells the owner to leave the accent
  to the colour scheme)
- **KWin's Breeze decoration does not read `[WM]`**: it takes the Header
  set's `BackgroundNormal` for the title bar (a magenta `activeBackground`
  changed nothing; a green Header background turned the title bar green).
  The installed programs that name the `[WM]` keys are `libkwin.so.6`,
  `gtkconfig.so` (which exports colours to GTK applications),
  `plasma_accentcolor_service.so`, `kcm_colors.so` and `breeze6.so`. (by
  their strings only, not by use)
- **The negative message's background shifts hue.** Dolphin's message for
  a missing folder is drawn in `#492829`, OKLCH 32 % 0.0496 18 (a chroma
  just under the 0.05 at which a colour counts as a hue). That it is
  KColorScheme's `background negative`, a tint of ForegroundNegative
  (`#e89887`, hue 33), is unverified: a warning message does not follow
  the colour scheme at all but is Breeze's orange (verified, 2026-11-13,
  P3.9; see [Union](#union)), so the red may be Breeze's fixed red too
  (see [Unverified](#unverified-2)).
- **Qt draws the text cursor of a text field inverted** over what is under
  it, so on tone 2 it is `#dadde0`, a cool grey; on a well, tone 0, it is
  `#eaebec`, and on a focused well, tone 1, `#e3e5e7` (verified, 2026-11-12,
  P3.4). Neither the colour scheme nor the Union style can change it: a
  known gap (D-94).
- **Which colour set paints which surface.** In Dolphin the file view is
  the View set; the places panel, the information panel and the status bar
  (small or full width) are the Window set, and the header toolbar is the
  Header set. Kate's sidebar, tool views and status bar are the Window set.
  A settings dialog's body is the Window set and its page list, on the
  left, the View set.
- **Text fields outside the Union style show tone 2**, the View background:
  Dolphin's location bar when edited, the search and path fields of the
  settings dialogs. Breeze's wells are not Amber's (D-90). With Amber's
  Union style they are wells, tone 0, except a text area, whose inside
  stays tone 2 (verified, 2026-11-12, P3.4; see [Union](#union)).
- **KWin dims the window behind a dialog** (the dialog parent effect),
  darkening and desaturating it: tone 0 became `#0d0c0c` to `#090808`.

### Unverified

| Question | Tested in |
|---|---|
| Does an accent colour chosen in System Settings replace the scheme's Selection and DecorationFocus? It is applied by rewriting `kdeglobals`, which a check may not do. | P6.2 |
| Is a positive message Breeze's green, as a warning is Breeze's orange (P3.9)? No application showed one. Is the negative message's red the colour scheme's tint or Breeze's fixed red? | P6.3 |

## Konsole and Kate

- Konsole has one profile, "Profile 1", with no colour scheme of its own.
  (verified, 2026-11-11)
- Kate 26.08.2 is installed, as is KWrite, which shares its editor component.
  (verified, 2026-11-11)
- No user editor themes exist yet. (verified, 2026-11-10)
- With no editor theme chosen, Kate picks Breeze Dark's under a dark colour
  scheme such as Amber: its editor area and minimap show cool greys
  (`#232629`, `#31363b`) until the editor theme of P4.2 is chosen.
  Konsole's default profile, and Kate's terminal panel, show Breeze's
  terminal colours (`#232627`). (verified, 2026-11-12, P2.3)
- **The pane header follows the terminal colours.** In a split view
  Konsole draws a pane header above each pane: the focused pane's in the
  terminal colours' `Background`, the other's a little darker, which
  Konsole derives. Under Breeze's terminal colours that was the cool dark
  `#1f2121` P3.9 saw; under Amber's it is tone 1 and `#191815`, warm. No
  rule of the style reaches it. (verified, 2026-11-13, P4.1)
- **A Konsole colour scheme file** (`.colorscheme`) is INI: groups
  `[Background]`, `[Foreground]` and `[Color0]` to `[Color7]`, each also
  with a `Faint` and an `Intense` variant, every one holding
  `Color=r,g,b`, and `[General]` with `Description`, `Opacity`, `Blur`,
  `ColorRandomization` and `Wallpaper`. Konsole 26.08.2 has no such files
  on disk: its built-in schemes, Breeze among them (background
  `35,38,39`), are compiled into `libkonsoleprivate.so.26.08.2`, where
  they were read. (verified, 2026-11-13, P4.1)
- **A colour scheme can be tried in one Konsole** without changing a
  setting: Konsole finds `konsole/<name>.colorscheme` in a folder put first
  in `XDG_DATA_DIRS`, and `konsole --separate -p ColorScheme=<name>`
  starts one window with it. In the nested session neither `konsolerc`
  nor a profile changed. (verified, 2026-11-13, P4.1)
- **Konsole's scrolled-lines bar** ("Highlight scrolled lines", on by
  default) is a bar about 3 px wide in the left margin, ANSI blue
  (`Color4`) at about 59 % over `Background`: under Amber `#365363`,
  the same mix on every channel. Konsole's margin around the text is
  `Background`. (seen, 2026-11-13, P4.1; that the bar takes `Color4` is
  inferred from the measured mix, not read in Konsole's code)
- **Konsole draws bold text in the intense colours** (bold plain text in
  `ForegroundIntense`, bold red in `Color1Intense`) and faint text (SGR 2)
  in the faint ones. (verified, 2026-11-13, P4.1)
- **Driving Konsole from outside:** `KMainWindow.activateAction
  split-view-left-right` on `/konsole/MainWindow_1` splits a live session,
  but not one held after its command ended (`--hold`). `Session.runCommand`
  is refused: Konsole's "security sensitive" D-Bus calls are off by
  default. (verified, 2026-11-13, P4.1)

## Spike findings

Each spike adds a dated entry here: the question, what was done, what was
seen, and what it changes.

### P0.3 Widget glow — 2026-11-11

**Questions.** Does a coloured, blurred `box-shadow` show as a glow on a
button in a Qt Widgets application, and what clips it? Can one application
run with a style installed for the user? Where is such a style installed?

**What was done.** A throwaway style, `amber-spike`, was made from a copy of
the Breeze style plus one file of rules for `button`, installed with
`union-styletool install`, and given to a PySide6 test application with
`UNION_STYLE_NAME=amber-spike`. The application placed buttons at the
window's edge, touching each other, 4 px apart, in a tight frame, beside a
text field, and with room on all sides, and saved pictures of its own
window. The same style was then given to a small Qt Quick window. The
symbols that `UnionWidgetsStyle.so` imports were listed with `nm`.

**What was seen.**

- *Install path:* `~/.local/share/union/styles/amber-spike/`, as copies.
- *One application alone:* yes. With the variable set, the test
  application's buttons were square and had no border; without it, the same
  application looked like Breeze, pixel for pixel as before.
- *Glow in Qt Widgets:* **no.** Three rules were tried on `button`: a shadow
  with 18 px blur in fully opaque accent; a shadow with 6 px offset and 6 px
  spread; a 4 px green outline. The rule inspector showed each as matched.
  None drew a single pixel, on any of the buttons, so clipping could not be
  studied. The background colour set in the same rule was drawn.
- *Why:* `UnionWidgetsStyle.so` imports the accessors for a style's
  background, border, corners, icon, layout and text. It imports none for
  shadow or outline, which suggests that the Qt Widgets style of 6.8.2 has
  no code to draw them for any widget. Only buttons were tried, so for other
  widgets this is unverified.
- *Glow in Qt Quick:* yes. The same rules drew the shadow and the outline.
  At the design language's focused amounts (18 px blur, 45 % alpha, accent)
  the result is a soft glow that does not read as a line (my call, judged
  from a saved picture at scale 1.49; the owner has not judged it). A neighbour that
  comes later in the layout paints over the glow of the one before it; the
  window's edge cuts it.
- Scale of the display during the run: 1.49.

**What it changes.**

- Dolphin, Kate and Konsole are Qt Widgets applications, so with Union 6.8.2
  Amber's Union style cannot show a glow in any of them. Goal 4 of the
  vision and D-4 could not be met there as designed. This was open question O-2
  and was the owner's to decide; it is decided, see P0.5 below.
- Whatever is decided, hovered, focused and pressed can still be shown by
  background colour, which is drawn.
- P3.1 can use the install path, `UNION_STYLE_NAME` and the edit loop above
  as they are. P6.1 must remove the empty folders and the cache file that
  uninstalling leaves behind.

### P0.5 Glow without a shadow — 2026-11-11

**Question.** Asked by the owner before deciding O-2: can a glow be made on
a button in a Qt Widgets application from what Union does draw there?

**What was done.** The set-up of P0.3 again, with a test application that
can mark a button as hovered or focused for a picture. One loud rule at a
time was tried for `inset`, `margin` and `background-image`; the facts are
under "Union CSS" above. Then four candidates were pictured, each at rest,
hovered and focused.

**What was seen.**

- **A blurred glow cannot be made.** Nothing that the Qt Widgets style draws
  can fade: a background and a border are flat colours, and an image mask
  is on or off per pixel. An image also keeps its own size, so it cannot
  follow a button's width.
- What can be made are flat stand-ins:
  - *tone:* hovered is a lighter tone; focused is the tone mixed with
    accent. No change in size.
  - *rim:* a 3 px border inside the button, the tone mixed with accent,
    stronger when focused. No change in size.
  - *band:* a 5 px border in part-transparent accent around the button, on
    the surface, with `inset` keeping room for it. Every button is 10 px
    wider and taller (34 px to 44 px high at the Breeze style's sizes), and
    the room is kept at rest too.
- The rim and the band have hard edges. They read as a frame, not as light
  (my call; the owner judges from the pictures).
- Not tried: a dithered mask, which could give a grainy fade but only on
  widgets of one fixed size, such as check boxes.

**What it changes.** The owner saw the candidates and a live sample window
of the tone-only one, with text inputs and buttons, and decided on
2026-11-11: no glow anywhere, state by tone alone (D-4). Since P0.6 the active
window alone has a window glow (D-26). The sample's tones
are the starting point in the [design language](design-language.md).

### P0.4 Square decoration — 2026-11-11

**Question.** Can an Aurorae theme draw a window decoration with square
corners and no border line on any edge?

**What was done.** A throwaway theme, `amber-spike`, was copied to
`~/.local/share/aurorae/themes/` and selected only in a nested KWin that
had its own configuration, cache and D-Bus session. A PySide6 window filled
with one flat colour was opened in it and pictured with Spectacle. The
frame was magenta, the content green and the backdrop black. The window's
title was one space, which shows no text, and the nested KWin was set to
show only the close button, a white square. So every pixel of a picture
could be counted by colour: a rounded corner or a line would show as a
colour that is none of these.
Then the frame was set to tone 0, over content in tone 0 and in tone 1.
Scale 1 was pictured on a virtual output and scale 1.49 in a window on the
owner's display.

**What was seen.**

- *Aurorae was drawing:* yes. The title bar was magenta, and followed a
  change of the SVG's colour at the next start.
- *Corners:* **square.** All four corner pixels of the window were the
  frame's or the content's colour, and no picture held a blended colour.
  Breeze's decoration, pictured the same way first, has rounded corners.
- *Edges:* **no line**, once KWin's border size was "No borders". The
  content met the backdrop on the left, right and bottom, and met the title
  bar in one row, with no pixel of another colour between them. This held
  for an active window, an inactive window, a maximised window, which
  filled the output with no gap, and a window maximised and then restored.
  It held at scale 1 and at 1.49.
- *With the border size at its default:* a border 4 px wide in the frame's
  colour on the left, right and bottom, whether the theme asked for 0 or
  for −100; 6 px when the theme asked for 10. At "Tiny" it was 1 px, and at
  "No side borders" 1 px remained at the bottom.
- *Tones:* with a tone 0 frame over tone 0 content, every pixel of the
  window except the button was `#151413`. Over tone 1 content the only
  change was the step from `#151413` to `#1c1a18`, in one row.
- No shadow was drawn; none was asked for.
- *The owner's look:* the owner saw an active and an inactive window with
  the tone 0 frame in a live nested KWin, at scale 1.49, and confirmed
  square corners and no line. They also saw that two such windows cannot
  be told apart where they overlap, and decided that a window has a window
  outline (D-25).
- *Window outline, tried after that decision:* a frame with edge pieces
  1 px thick in yellow around a magenta centre, with the theme's borders
  at 1. The facts are under "Window decoration" above.

**What it changes.**

- D-34 stands: the decoration can be an Aurorae theme, with no compiled
  code.
- The requirement changed: D-25 and the "Window decoration" section of the
  [design language](design-language.md). The window outline's colour and width
  were open question O-4, closed on 2026-11-12 (D-62).
- What shows at a window's edge depends on KWin's border size, which is a
  system setting, so the owner sets it; P6.2 must say so in the README,
  beside selecting the decoration. For the window outline alone it is
  "Tiny". Left at its default, a band 3 px wide in tone 0 sits between the
  window outline and the content.
- P5.1 to P5.3 can try the decoration in a nested KWin as above. P5.1 can
  start from nine plain rectangles per window state, and must settle the
  uneven window outline at scale 1.49.

### P0.6 Window shadow and glow — 2026-11-11

**Questions.** Asked by the owner after P0.4: can Amber change the shadow
that windows have under Breeze's decoration, and can a window have a subtle
glow?

**What was done.** The set-up of P0.4 again, with a stone-coloured window
without a decoration as the backdrop, so that a dark shadow and a light
glow could both be seen. Breeze's decoration was pictured first. The spike's
theme then got padding and gradients in its frame: a black shadow 24 px
wide at 50 %; one 48 px wide at 80 %; one with paddings of 16, 8, 16 and
40 px; a blur filter in place of the gradient on the top edge; a glow in
accent at 28 % and at 60 % for the active window with the black shadow for
the inactive one; and the 28 % glow with a window outline 1 px wide, at
border size `Tiny`. Pixels were read outwards from the window's edge.

**What was seen.**

- *Shadow:* yes. Each one was drawn as written, soft, outside a window
  whose corners stayed square, and each change of width, strength and
  shape showed. The facts are under "Window decoration" above.
- *Glow:* yes. The active window had a soft accent glow that fades to
  nothing over 24 px, and the inactive window behind it kept its dark
  shadow. The glow fell on the inactive window where they overlapped. On a
  tone 0 backdrop the glow showed as well; the dark shadow there could
  hardly be seen.
- *With the window outline:* the outline sat between the glow and the
  window. Sharp at scale 1; a little soft at 1.49.
- *Maximised:* no shadow, glow or outline, at either scale. Restored, they
  came back.
- At 28 % the glow is quiet and reads as light, not as a line; at 60 % it
  is plain to see (my call, from the pictures; the owner judges from the
  live window).

**What it changes.**

- P5.3 can draw the shadow as gradients in the frame's SVG; the question
  of how an Aurorae theme draws a shadow is answered.
- The owner saw the live window and decided on 2026-11-11: the active
  window has a window glow, and an inactive window a shadow (D-26). The
  glossary, D-4 and the [design language](design-language.md) say so.
- The window glow marks the active window, so it is a mark of state. Its
  amounts were settled with the window outline on 2026-11-12 (D-59 to
  D-62).
