# Amber — Roadmap

> Status: **Accepted** on 2026-11-11

The work is done in steps. Each step is split into small plans. A plan has one
result that can be tested on its own, and is small enough to build and check in
one sitting.

## How plans are used

- A plan is written just before its work starts, not all at once, so that it
  can use what the plans before it taught us.
- Plan files live in `docs/superpowers/plans/`, named
  `P<step>.<number>-<short-name>.md`, for example `P1.3-gallery-buttons.md`.
- A plan is finished only when its "done when" line below is true and has been
  checked.
- When a plan is finished, set its status here in the same change. When a plan
  changes what the documents say, update the documents in the same change.
- If a plan turns out too large, split it and renumber here.

Status values: **todo**, **in progress**, **done**, **dropped**.

## Step 0 — Foundations and spikes

Answers the open questions about the platform before the look is fixed, so
that the prototype never promises something the system cannot draw.

| Plan | Result | Done when | Status |
|---|---|---|---|
| P0.1 Repository basics | `.gitignore`, MIT `LICENSE`, README stub, first commit | `.superpowers/` and `.idea/` are ignored; the first commit exists | done |
| P0.2 Tools base | `tools/` with the `colour` tool and the `ai-tools` skill | `colour contrast` gives the same ratios as the table in the accessibility document; tests pass | done |
| P0.3 Spike: widget glow | Findings on coloured, blurred shadows under Union, on running one application with a style installed for the user, and on where such a style is installed | A button in a Qt Widgets application shows a glow from a style used by that application alone, or the reason it cannot is written in the platform document; all three findings are written there | done |
| P0.4 Spike: square decoration | Finding on Aurorae | A window shows a square title bar with no border line, or the reason it cannot is written in the platform document | done |
| P0.5 Spike: glow without a shadow | Finding on whether a glow can be made in a Qt Widgets application from what Union does draw there: a background image, `inset` and `margin` | Pictures show a hovered and a focused button with such a glow in a Qt Widgets application, or the reason it cannot is written in the platform document; what the glow costs in layout is written there | done |
| P0.6 Spike: window shadow and glow | Findings on the shadow an Aurorae theme draws around a window, and on a glow drawn the same way | Pictures show a window with a shadow of Amber's own and a window with a glow, or the reason either cannot be drawn is written in the platform document | done |
| P0.7 Browser tool | `browser` tool: screenshots in a state, the rendered anti-goal check, computed colours named as tokens, through the installed Chrome | `browser check prototype/index.html` passes in the tests; a screenshot of the hovered close button shows danger | done |

P0.4 was written when the decoration was to have no line at all. The spike
showed a square title bar with no border line; on seeing it the owner
decided that a window has a window outline: D-25 in the
[decisions](../architecture/decisions.md).

P0.3 is done by its second clause: the glow cannot be drawn in Qt Widgets
applications, and the reason is in the platform document. After P0.5 the
owner decided that no widget glows: D-4 in the
[decisions](../architecture/decisions.md). After P0.6 the owner decided
that the active window has a window glow: D-26.

The folders of the repository layout are not created empty: each appears with
its first file, in the plan that fills it.

P0.7 was added after P1.2, on the owner's suggestion: a tool built on
Playwright, so that the prototype can be seen in a browser in every state.
It is a tool, not a spike.

P0.3, P0.4, P0.5 and P0.6 are spikes: their code is thrown away and their findings go into
[platform](../architecture/platform.md). A failed spike goes back to the owner
before the next step.

## Step 1 — Prototype

The gate for everything after it: the owner approves the look here.

| Plan | Result | Done when | Status |
|---|---|---|---|
| P1.1 Tokens and contrast pairs | Tokens file, contrast pairs, `tokens` tool | `tokens pairs` runs in the tests and every pair passes | done |
| P1.2 Window shell | Mock file-manager window: title bar, toolbar, sidebar, list, status area; a second window behind it, with candidates for the window outline, the window glow and the shadow | The page opens from disk and shows every surface by tone alone; the two windows can be told apart where they overlap | done |
| P1.3 Gallery: buttons and inputs | Buttons, tool buttons, combo boxes, text fields, spin boxes, text areas in every state | Each state is shown side by side and reacts to pointer and keyboard | done |
| P1.4 Gallery: toggles and ranges | Check boxes, radio buttons, sliders, progress bars, scrollbars | As P1.3 | done |
| P1.5 Gallery: navigation, views and popups | Tabs, list items, tree and table views with headers, menus, popups, tooltips, a dialog | As P1.3 | done |
| P1.6 Terminal and code samples | Terminal colours and syntax colours shown on real-looking samples | Every colour except ANSI black, which is exempt, has a contrast pair and passes | done |
| P1.7 Owner review | Tuned values; the owner's choices for the open questions O-1, O-3 and O-4 | The owner approves the prototype and O-1, O-3 and O-4 are closed in the decisions | done |

P1.3 to P1.6 showed candidates beside the starting values, each with its
measured contrast, so that the owner could decide by eye. In P1.7 the
owner chose among them, the open questions O-1, O-3, O-4 and O-5 were
closed, and the owner approved the prototype on 2026-11-12: D-59 to D-85
in the [decisions](../architecture/decisions.md). The prototype shows no
candidate now.

## Step 2 — Colour scheme

| Plan | Result | Done when | Status |
|---|---|---|---|
| P2.1 Role mapping | Table of which token feeds which colour-scheme role | Every role of a `.colors` file has a token or a written rule | done |
| P2.2 Generator | `Amber.colors` generated from the tokens | Running the generator twice gives the same file; tests pass | done |
| P2.3 Check in applications | The scheme seen in Dolphin, Kate and Konsole | No cool grey is visible; findings are written down | done |

The table of P2.1 is `parts/colour-scheme/roles.json`; its rules are in
[colour-scheme](../architecture/colour-scheme.md). Before P2.1 the owner
chose the selection, the link and status colours and the focus and hover
lines: D-86 to D-88 in the [decisions](../architecture/decisions.md). P2.3
also tests the facts P2.1 left unverified in the
[platform](../architecture/platform.md#colour-scheme) document. The
generated file of P2.2 is `parts/colour-scheme/Amber.colors`, made by
`generate colour-scheme`.

P2.3 checked the scheme in a nested KWin, without changing a system
setting, and read every picture with the `image` tool. Its findings are in
the [platform](../architecture/platform.md#colour-scheme) document; the
known gaps it found are in the README. The colour scheme brings no cool
grey; the owner accepted the derived negative message background as a dark
red (D-93), and counted the greys of icons, the text cursor and KWin as
outside Amber (D-94). On seeing Dolphin, the owner had the Window set moved
to tone 1, so that sidebars, panels and status bars sit a tone below the
view (D-95).

## Step 3 — Union style

One widget family per plan, each checked in a real application before the
next starts.

| Plan | Result | Done when | Status |
|---|---|---|---|
| P3.1 Skeleton | A copy of the Breeze style installed as `amber` | One application runs with it without changing system settings | done |
| P3.2 Global rules | Radius zero, borders removed, variables for the tones of each state | No rounded corner or outline on the widgets not yet restyled | done |
| P3.3 Buttons | Buttons, tool buttons, combo boxes | Matches the prototype in every state | done |
| P3.4 Text inputs | Text fields, spin boxes, text areas | As P3.3 | done |
| P3.5 Toggles and ranges | Check boxes, radio buttons, sliders, progress bars | As P3.3 | done |
| P3.6 Bars | Toolbars, menu bar, status bar, tab bars, scrollbars | As P3.3 | done |
| P3.7 Lists and tables | List items, tree and table views, headers | As P3.3 | done |
| P3.8 Popups | Menus, popups, tooltips, dialogs | As P3.3 | done |
| P3.9 Application sweep | Dolphin, Kate and Konsole checked window by window | Every breach of an anti-goal is fixed or listed as a known gap | done |

P2.3 found these for Step 3, all drawn by the Breeze style or by Qt, not by
the colour scheme: the 1 px border under the header toolbar (P3.6); the
accent frame of a selected or current item and the lines between header
sections (P3.7); text fields drawn in tone 2 instead of a well, and a text
cursor that Qt draws inverted, so that on tone 2 it is the cool grey
`#dadde0` (P3.4, which decides whether the cursor becomes a known gap);
rounded corners everywhere (P3.2). Since D-95 a settings dialog's page
list, a View, is tone 2 on a tone 1 body, the reverse of a sidebar; P3.7
found it out of the style's reach, a known gap (D-113).

P3.2 removed the border under the header toolbar, the accent frame of a
selected item, the lines between header sections and every rounded corner,
along with every other border and outline (D-98). Focus, which Breeze drew
with those borders, and the highlight of a selected tab now wait for their
family's plan. A line Qt draws itself stays: the grid of a table view
(P3.7).

P3.3 restyled push buttons, tool buttons and read-only combo boxes; the
probe's pictures match the gallery in every state they reach, and the owner
tried them in Dolphin. Union cannot tell the default button of a dialog from
the others, so the primary button is drawn as any other, in Qt Quick too,
and is a known gap (D-100). For the plans after it: `browser states` and `image states`
compare a family's states with the gallery, as P3.3 did; P3.4 takes the
editable combo box, which is a well.

P3.4 made text fields, spin boxes and editable combo boxes wells, with the
focus bar drawn as a 3 px border at the foot. On seeing them in Dolphin the
owner gave a hovered well a tone of its own, `well-hover`, since tone 1 is a
dialog's body (D-102), and had a clicked field show focus as a tabbed one
does (D-103). A text area's inside, a spin box's step arrows and disabled
text are drawn by Qt from the colour scheme, out of the style's reach, and
are known gaps with the text cursor (D-104, D-94). The probe's
`--no-cursor` draws a focused field without its cursor, and `image states
--foot` checks the bar.

P3.5 gave check boxes, radio buttons, sliders and progress bars Amber's
tones, with the tick, partly checked bar and dot redrawn with square ends.
On seeing Dolphin the owner gave a hovered unchecked toggle `well-hover`,
as tone 1 is a dialog's body (D-106). A busy progress bar, drawn as a full
fill, and Union's 9 tick marks out of 11 are known gaps (D-107). `image
states --region` and `browser states --text-property` compare one part of a
widget, such as a box or a thumb.

P3.6 gave toolbars, the menu bar, the status bar, tabs and scrollbars
Amber's tones (D-108): a selected tab carries the block marker on its outer
edge, and a scrollbar is a 12 px thumb with no arrows. Union draws no tab
bar, so each tab paints tone 0; the strip past the last tab, the track
beside a view, the status bar's text, a disabled menu title and the thumb's
hover are known gaps (D-109).

P3.7 gave the items of views, trees, tables and headers Amber's tones
(D-112). In Dolphin the owner saw a selected file's text drawn from the
colour scheme, and chose that a selected item keeps its text colour: the
colour scheme's Selection became the dark gold `text-selection`, which
Breeze's folder icons take too (D-110); and that no selected item carries a
block marker, since Union cannot tell a sidebar from a list (D-111). A
table's grid, an item's padding, per-cell hover and focus, a tree's
indentation and a view's own background are known gaps (D-110, D-113).

P3.8 gave menus, combo box lists, tooltips and Qt Quick dialogs Amber's
tones (D-114), checked on screen: under Xwayland a script opens a popup,
and under Wayland the owner did. A combo box's list was transparent because
its window is clear and Breeze inset its items; each item now fills the
list, its text lined up with the combo box's at the owner's request.
Qt Widgets draws no popup shadow (D-74); a label's start, a message's line
and a tooltip's padding are known gaps, and a menu that shifts under
Xwayland is an X11 fault (D-115).

P3.9 swept about a hundred windows and states of Dolphin, Kate and Konsole
with `image greys` and the new `image lines`. The splitter, a 1 px line
between panes, is now a clear gap 4 px wide, and four seams that a
fractional scale showed are closed by a fill 1 px past the edge (D-116).
Messages in Breeze's colours, tone 1 around tabs, a colour button's frame
and Kate's stacked buttons are known gaps (D-117); Konsole's pane header,
a cool dark, is left to P4.1.

The style lives in `parts/union-style/amber/`, which started as an
unchanged copy of the Breeze style (D-96) and gets its tokens from
`contents/css/tokens.css` (D-97). It is not installed: each plan of Step 3 tries it in
P2.3's nested session, which finds it through `XDG_DATA_DIRS`, as the
[platform](../architecture/platform.md#tools-and-switches) document says.

## Step 4 — Terminal colours and editor theme

| Plan | Result | Done when | Status |
|---|---|---|---|
| P4.1 Terminal colours | `Amber.colorscheme` generated from the tokens | Konsole shows it; it matches the prototype's sample | done |
| P4.2 Editor theme | Kate theme generated from the tokens | Kate shows it; it matches the prototype's sample | done |

P4.1 generated `parts/terminal-colours/Amber.colorscheme` from the tokens
and `keys.json`, which gives every Konsole key a token (D-118), with
`generate terminal-colours`. The new `sample terminal` prints the
prototype's terminal sample with escape sequences, and in the nested session
Konsole drew it with the same tokens as the browser. On trying it the owner
had the greys made four steps, the bright colours lighter and cyan more
saturated, choosing among candidates tried in Konsole through `generate
--set` (D-119). White on a normal colour is 2.3:1, which the owner accepted.
Konsole's pane header, the cool dark P3.9 left here, follows the terminal
colours and is warm now. Konsole's scrolled-lines bar, ANSI blue mixed
over the background, falls just short of a hue and is a known gap (D-120).
`image greys --token-blends` excuses anti-aliased
text of token colours, such as ANSI blue and cyan, which P4.2's editor
will need too.

P4.2 generated `parts/editor-theme/Amber.theme` from the tokens and
`styles.json`, which gives each text style and editor colour a token
(D-121), with `generate editor-theme`. `sample editor` prints the
prototype's code, and `sample compare-editor` checks the colours that
`ksyntaxhighlighter6` gives it with the theme, the library Kate uses; a
spec runs both. Kate's C++ highlighting leaves a user's function names
and constants as plain text, so the owner had the sample show what Kate
draws (D-123). A new token, the olive search highlight, was chosen by the
owner among candidates (D-122). In the nested session Kate drew the
sample in the same tokens as the browser. The seam Kate draws across the
current line and its inverted caret are known gaps (D-124).

## Step 5 — Window decoration

| Plan | Result | Done when | Status |
|---|---|---|---|
| P5.1 Frame and title bar | Square frame with a tone 0 title bar and the window outline | Matches the prototype for active and inactive windows | done |
| P5.2 Window buttons | Minimise, maximise, close in every state | Matches the prototype | done |
| P5.3 Glow, shadow and window states | Window glow for the active window, shadow for an inactive one; maximised and tiled windows | Matches the prototype; no line but the window outline appears at any window edge in any state; a maximised window shows no outline, glow or shadow | done |

P5.1 generated `decoration.svg` and `amberrc` of the Aurorae theme
`parts/decoration/amber/` from the tokens with `generate decoration`, and
the new `image profile` read each edge of a window against the prototype.
The owner saw the frame live and confirmed it matches (D-125). The window
outline is 1 or 2 device pixels wide at fractional scales, and one edge can
lose it under Xwayland: a known gap (D-126). No theme key recommends a
border size, so the README of P6.2 must have the owner choose "Tiny". For
P5.2: the frame has no button, `ButtonsOnLeft` was emptied in the nested
KWin, and with no button the title runs to within 2 px of the outline. For
P5.3: the frame has no padding, and maximised windows were not looked at.

P5.2 generated the window buttons, one file each with an element per
state, and added their every state to the gallery (D-128). In the nested
KWin, with KWin's default buttons, every state matched the gallery, and
the owner found them right live. KWin keeps its menu button, the
application's icon, and centres the title between the buttons; the owner
kept both, and the prototype now draws them (D-129). After the final
review the owner tried two drawings live and chose that a button's fill
keep off the window outline, so that the outline stays whole at 1.49; a
hovered or pressed button then shows a seam at the outline, a known gap
(D-130). For P5.3: a maximised window shows restore at rest and no window
outline. For P6.2: the README need not change KWin's button settings.

P5.3 generated the window glow and the shadow into the frame, after a probe
in the nested KWin showed that an element may reach inside the window
(D-131). The gallery's "Windows" shows both lights on known backdrops,
and the new `image light` compares a shot with the tokens: KWin matched
them within 0.004 at scale 1. Maximised windows need nothing more; tiled
windows keep every edge; a click in the light goes to what lies behind.
Live, the owner chose a fainter glow set a little lower, with three new
tokens (D-132), and a faint seam beside the outline at a fractional scale
is a known gap (D-133). For P6.1: the theme is still the six files of
`parts/decoration/amber/` and `metadata.desktop`. For P6.2: the border
size must still be "Tiny"; the known gaps of D-126, D-127, D-130 and D-133
are in the README.

## Step 6 — Packaging

| Plan | Result | Done when | Status |
|---|---|---|---|
| P6.1 Install and uninstall | One command each | Uninstall leaves no file behind | todo |
| P6.2 README | How to install, select (with KWin's border size), change a token; known gaps | A reader can do all three from the README alone | todo |
| P6.3 Acceptance check | Every line of "What success looks like" in the vision checked | Each line is confirmed or recorded as a known gap | todo |
