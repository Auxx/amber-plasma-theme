# Amber — Platform

> Status: **Accepted** on 2026-11-11

What is known about the target system, and what is not. Every fact is marked
**verified** (seen on the owner's machine, with the date) or **unverified**.
Nothing is built on an unverified fact: a spike or a plan tests it first and
moves it to verified, with what was found.

Target: Fedora 45, KDE Plasma 6.8.2, Wayland session assumed (unverified).

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
- Dolphin, Kate and Konsole are Qt Widgets applications and are drawn through
  `UnionWidgetsStyle.so`. Qt Quick applications use the same style through
  `org.kde.union`.

### Union CSS

- States: `:hovered`, `:visual-focus`, `:checked`, `:disabled`, and others
  used in the Breeze style.
- Properties: every supported property is listed in
  `/usr/share/union/css/defaults/generated-properties.css`. They include
  `border`, `border-radius` per corner, `outline`, `box-shadow`, `padding`,
  `spacing`, and layout and icon properties of Union's own.
- **`box-shadow` is `none` or exactly one shadow**: four lengths and a
  colour. There is no `inset`, and shadows cannot be stacked.
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
  states and hints, for a style named with `--style`.
- Environment variables found in the Union libraries: `UNION_STYLE_NAME`,
  `UNION_DISABLE_STYLE_CACHE`, `UNION_FORCE_RECREATE_STYLE_CACHE`,
  `UNION_FORCE_PLATFORM`, `UNION_DISABLE_INPUT_PLUGINS`.
- A `unionStyle` configuration key was reported in the Union library by the
  design reviewer. **Unverified.**

### Unverified

| Question | Tested in |
|---|---|
| Does a coloured, blurred `box-shadow` show as a glow in a Qt Widgets application, and is it clipped by neighbouring widgets or the edge of its parent? | P0.3 |
| Does `UNION_STYLE_NAME=amber` run one application with a style installed for the user? | P0.3 |
| Where does `union-styletool install` put a style for the user? | P0.3 |
| Which key selects the style for the whole system? | P6.2 |

If the glow cannot be drawn, the work stops and goes back to the owner: the
glow is a goal, and what replaces it is their decision.

## Window decoration

- KWin draws the decoration; Union does not. (verified, 2026-11-10)
- `aurorae` 6.8.2 is installed. `~/.local/share/aurorae/themes/` exists and
  is empty. (verified, 2026-11-10)

### Unverified

| Question | Tested in |
|---|---|
| Can an Aurorae theme draw square corners, with no border line on any edge? | P0.4 |
| Can its buttons show a glow when hovered? | P0.4 |
| How does it draw its shadow, and does the shadow hide when maximised? | P5.3 |

If the buttons cannot glow, Amber ships without it and lists a known gap. If
square corners or a borderless frame cannot be done, the work stops and goes
back to the owner. A compiled decoration, or Breeze's own decoration, is not
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

None yet. Each spike adds a dated entry here: the question, what was done,
what was seen, and what it changes.
