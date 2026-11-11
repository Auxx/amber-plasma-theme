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
  `kirigami.css`, `calendar.css`, `widgets.css`, joined by `style.css`. Its
  licence is BSD-2-Clause.
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
  (verified, 2026-11-11)
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
- Environment variables found in the Union libraries: `UNION_STYLE_NAME`,
  `UNION_DISABLE_STYLE_CACHE`, `UNION_FORCE_RECREATE_STYLE_CACHE`,
  `UNION_FORCE_PLATFORM`, `UNION_DISABLE_INPUT_PLUGINS`.
- A `unionStyle` configuration key was reported in the Union library by the
  design reviewer. **Unverified.**

### Unverified

| Question | Tested in |
|---|---|
| Is a shadow drawn under menus and popups in a Qt Widgets application? They are windows of their own, and the Breeze style gives them a `box-shadow`. | P3.8 |
| How does the Breeze style show focus in a Qt Widgets application, given that its focus `outline` is not drawn? | P3.2 |
| Which key selects the style for the whole system? | P6.2 |

The glow cannot be drawn in Qt Widgets applications (P0.3, P0.5). The owner
decided on 2026-11-11 that Amber has none: D-4 in the
[decisions](decisions.md).

## Window decoration

- KWin draws the decoration; Union does not. (verified, 2026-11-10)
- `aurorae` 6.8.2 is installed. `~/.local/share/aurorae/themes/` exists and
  is empty. (verified, 2026-11-10)

### Unverified

| Question | Tested in |
|---|---|
| Can an Aurorae theme draw square corners, with no border line on any edge? | P0.4 |
| How does it draw its shadow, and does the shadow hide when maximised? | P5.3 |

If square corners or a borderless frame cannot be done, the work stops and
goes back to the owner. A compiled decoration, or Breeze's own decoration, is not
used without their say. (my call)

## Colour scheme

- No user colour schemes exist yet: `~/.local/share/color-schemes/` is empty.
  The active global theme is Fedora's dark Breeze variant. (verified,
  2026-11-10)

### Unverified

| Question | Tested in |
|---|---|
| Can Dolphin, Kate and Konsole each be given a colour scheme of their own from their Settings menu, so that the scheme can be tried without changing the system's? | P2.3 |

## Konsole and Kate

- Konsole has one profile, "Profile 1", with no colour scheme of its own.
  (verified, 2026-11-11)
- Kate 26.08.2 is installed, as is KWrite, which shares its editor component.
  (verified, 2026-11-11)
- No user editor themes exist yet. (verified, 2026-11-10)

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
2026-11-11: no glow anywhere, state by tone alone (D-4). The sample's tones
are the starting point in the [design language](design-language.md).
