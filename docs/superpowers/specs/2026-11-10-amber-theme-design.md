# Amber — a warm, borderless dark theme for KDE Plasma (design)

Date: 2026-11-10

> **This is a dated record of the first design session.** The living
> documents replaced it on 2026-11-11 and are the truth where they differ:
> `docs/product/` (vision, glossary, roadmap) and `docs/architecture/`
> (overview, design language, accessibility, platform, tooling, decisions).

Target system: Fedora 45, KDE Plasma 6.8.2, Union style engine (`plasma-union` 6.8.2)

Items marked **(decided)** came from the owner. Items marked **(my call)** were
chosen by the designer and are open to change. Anything else is left to the builder.

## Intent

Breeze Dark is neutral-to-cool, outlined and rounded. The owner wants a dark
theme they use daily that is warm, flat and quiet: areas of an application are
told apart by tonal steps, not by lines, in the manner of the JetBrains
"Islands" theme. Widget state (hover, keyboard focus) is shown by a soft glow
instead of a hard outline.

The owner does not know how Plasma theming fits together, so the project must
also leave them able to keep tweaking it: one obvious place to change a colour,
and a fast way to see the result.

## Goals

1. **(decided)** Dark theme in warm tones; minimalist, clean, modern.
2. **(decided)** Square corners everywhere.
3. **(decided)** No outlines, no 1px separators or dividers. Separation is by
   tone only.
4. **(decided)** Hover and keyboard focus are shown as a subtle glow around the
   widget. Subtle shadows are allowed for depth and state.
5. **(decided)** Covers application widgets and window decorations.
6. **(decided)** Widgets are styled through Union.
7. **(decided)** Matching Konsole terminal colours and Kate editor colours.
8. **(decided)** A small HTML + CSS prototype for trying changes without
   touching system settings.
9. **(decided)** Judged in Dolphin, Kate and Konsole.

## Non-goals

- **(decided)** Icons (Breeze icons stay) and fonts (Noto stays).
- **(decided)** A light variant. Dark comes first; do not block a later light
  variant, but build nothing for it.
- **(decided)** Vivaldi, WebStorm and any other non-Qt application.
- **(my call)** Plasma shell (panel, launcher, desktop widgets), GTK
  applications, SDDM, splash screen, cursors, a global theme package. Could be
  later projects.
- **(my call)** Publishing to the KDE Store.

## Anti-goals — these fail the theme even if everything else works

- **(decided)** Any rounded corner.
- **(decided)** Any hairline border or divider.
- **(decided)** Any cool grey tone. Every neutral must lean warm.

Where the platform forces one of these and it cannot be removed (for example a
widget an application draws itself), record it in a "known gaps" list in the
README rather than hiding it.

## The look

The owner chose direction "C · Sand" from three mockups
(`.superpowers/brainstorm/7260-1794352906/content/warm-directions.html`, a
local file that is not kept in the repository). They
confirmed the direction, not each value; the values below are the starting
point **(my call)** and are expected to be tuned in the prototype.

| Role | Value | Used for |
|---|---|---|
| tone 0 | `#151413` | title bar, text-field wells, track of bars |
| tone 1 | `#1c1a18` | sidebars, secondary panels |
| tone 2 | `#25221f` | main window/content surface |
| tone 3 | `#312e29` | buttons and other raised widgets |
| tone 4 | `#3c3832` | hovered widget |
| text | `#e8e3da` | primary text |
| dim text | `#9c958a` | secondary, inactive, placeholder |
| accent | `#d1b072` | selection, checked, progress, primary button |
| on-accent | `#1b160b` | text on accent |
| danger | `#b5442f` | close button hover, negative states |

Behaviour **(my call unless noted)**:

- Buttons sit one tone lighter than their surface; text fields sit darker
  (a well). No inner shadows anywhere: Union cannot draw them.
- Hover: widget moves up one tone and gains a faint accent-coloured glow
  (about 12–14px blur, 20–28% alpha). **(glow: decided; amounts: my call)**
- Keyboard focus: a single stronger glow (about 18px blur, 45% alpha); it must
  not read as a hard line.
- Pressed: darker tone, no glow.
- Disabled: dim text, reduced opacity, no glow.
- Selected list/sidebar item: tone 3 background; an accent marker on the
  leading edge is allowed (a 3px block, not a hairline).
- Primary/default button: accent fill with on-accent text.
- Close button: danger fill and danger glow on hover.
- Menus, popups and tooltips: a tone step plus a drop shadow, no outline.

Glow must stay subtle: a row of ordinary widgets at rest shows no glow at all.

## The pieces

Six deliverables in one repository. Names and ids **(my call)**: theme name
"Amber", id `amber`.

1. **Prototype** — plain HTML + CSS, no build step, no framework, opened
   straight from disk. A mock file-manager-style window (title bar, toolbar,
   sidebar, list view, status area) plus a widget gallery showing every state
   (normal, hover, focus, pressed, checked, disabled) for buttons, tool
   buttons, text fields, combo boxes, check boxes, radio buttons, sliders,
   progress bars, tabs, menus, scrollbars and tooltips. Also a terminal sample
   and a code sample showing the Konsole and Kate colours. All colours and
   sizes come from CSS custom properties in one tokens file.
2. **Plasma colour scheme** — `Amber.colors`, installed to
   `~/.local/share/color-schemes/`. Carries the palette for every Qt
   application and for the Union style, which reads colours from the active
   colour scheme (`custom-color("kcolorscheme", …)`).
3. **Union style** — a style folder (`metadata.json` + `contents/css/…`) in the
   same shape as `/usr/share/union/styles/breeze`, installed with
   `union-styletool install`. Start from a copy of the Breeze style (BSD-2-Clause;
   keep its licence notices) and change it file by file. Colours should keep
   coming from the colour scheme where the scheme has a matching role; tones
   the scheme cannot express are derived or defined in the style's
   `variables.css`.
4. **Window decoration** — an Aurorae theme installed to
   `~/.local/share/aurorae/themes/`. Square corners, tone-0 title bar, no
   border lines, a soft drop shadow, minimise/maximise/close buttons with tone
   and glow hover states matching the widgets.
5. **Konsole colour scheme** — `Amber.colorscheme` in `~/.local/share/konsole/`.
6. **Kate editor theme** — a KSyntaxHighlighting `.theme` file in
   `~/.local/share/org.kde.syntax-highlighting/themes/`.

For 5 and 6 the syntax/ANSI colours are muted, warm-shifted hues that sit with
the Sand palette **(my call)**. They must be shown to the owner in the
prototype and approved before being written into the real files.

### Single source of colour **(my call)**

The owner should change a colour in one place. The prototype's tokens file is
that place. How the other five pieces stay in step with it (a small generator
script, or a documented manual checklist) is left to the builder; whichever is
chosen, the README must say exactly what to do after changing a token.

## Order of work **(my call)**

0. Two throwaway spikes: widget glow under Union, and a square borderless
   Aurorae decoration (see "Unverified" below).
1. Prototype, iterated with the owner until the look is approved. This is the
   gate for everything else.
2. Colour scheme.
3. Union style, one widget file at a time, checked in Dolphin, Kate, Konsole.
4. Konsole and Kate colours.
5. Window decoration.
6. Install/uninstall script and README.

## Constraints and facts about the target system

- Union 6.8.2 is installed and is already the active widget style
  (`widgetStyle=Union` in `kdeglobals`). Upstream labels it "In Development"
  and hides it in System Settings; expect gaps and breakage between releases.
- Only `union-input-css` exists as an input format. The CSS is a dialect, not
  browser CSS: states are `:hovered`, `:visual-focus`, `:checked`, `:disabled`;
  it has `border-radius`, `border`, `outline`, `box-shadow` with blur, plus
  functions such as `custom-color()`, `mix()` and `modify-color()`. The comment
  in the Breeze mobile style says media queries are not supported.
  Reference: `/usr/share/union/css/defaults/generated-properties.css` lists
  every supported property; https://api.kde.org/union-index.html is the manual.
- **Shadow limits (verified in `generated-properties.css`):** `box-shadow` is
  `none` or exactly one shadow of four lengths and a colour. There is no
  `inset` and no stacking of several shadows. So the inner shadows on text
  fields and pressed buttons, and the halo-plus-glow focus effect in the
  mockup, cannot be copied as drawn. **(my call)** The prototype is restricted
  to what Union can express: one outer shadow per widget; wells and pressed
  states are shown by tone alone; focus is a single stronger glow.
- Tools: `union-styletool` (create, install, update, uninstall, list, package)
  and `union-ruleinspector`.
- Environment variables found in the Union libraries: `UNION_STYLE_NAME`,
  `UNION_DISABLE_STYLE_CACHE`, `UNION_FORCE_RECREATE_STYLE_CACHE`. They look
  like the way to run one application with the new style without changing
  system settings. **Not yet tried.**
- Aurorae 6.8.2 is installed; no Aurorae themes exist on the system yet.
- Dolphin, Kate and Konsole are all installed (the owner installed Kate for
  this project; KWrite is also present).
- Dolphin, Kate and Konsole are Qt Widgets applications, so they go through
  `UnionWidgetsStyle.so`.

### Unverified — the builder must test these early

- Whether a coloured, blurred `box-shadow` renders as a glow in Qt Widgets
  applications under Union, and whether it is clipped by neighbouring widgets.
  If it does not work, stop and come back to the owner: the glow is a core
  goal, and the fallback is their decision.
- Whether `UNION_STYLE_NAME` selects a user-installed style per application.
- Whether Aurorae can draw fully square corners with no border line and a
  glowing button hover. **(my call)** Test this in an early throwaway spike
  too. If square and borderless works but button glow does not, ship without
  title-bar button glow and list it as a known gap. If square or borderless
  fails, stop and come back to the owner; do not start a compiled decoration
  plugin or fall back to Breeze decoration without their say.

**(my call)** Both spikes (widget glow, Aurorae) run before the owner is asked
to approve the prototype, so the prototype never promises a look the system
cannot draw.

## Working rules

- **(decided)** Development must not require changing the owner's system
  settings. Trying the style in one launched application is fine; switching
  the system-wide colour scheme, style or decoration is the owner's action.
- Nothing is written under `/usr`. Everything installs to the user's home
  directory and can be removed by the uninstall script.
- The project directory is already a git repository with no commits. Keep
  `.superpowers/` out of version control.

## Done means

- The owner has approved the prototype.
- With all pieces installed and selected, Dolphin, Kate and Konsole show no
  rounded corner, no hairline, and no cool grey, and hover/focus glow is
  visible on buttons and text fields.
- Kate's editor area and Konsole's terminal area match the frame around them.
- Changing one token and following the README updates every piece.
- Install and uninstall each work with one command, and uninstall leaves the
  system as it was.
- Known gaps are listed in the README.

## Left to the builder

- File layout of the repository.
- Exact glow, shadow, spacing and sizing values, within the rules above.
- Sync mechanism between tokens and the real theme files.
- Which Breeze CSS files need rewriting versus small edits.
- Aurorae theme technique (SVG or QML).
