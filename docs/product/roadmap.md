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
| P3.3 Buttons | Buttons, tool buttons, combo boxes | Matches the prototype in every state | todo |
| P3.4 Text inputs | Text fields, spin boxes, text areas | As P3.3 | todo |
| P3.5 Toggles and ranges | Check boxes, radio buttons, sliders, progress bars | As P3.3 | todo |
| P3.6 Bars | Toolbars, menu bar, status bar, tab bars, scrollbars | As P3.3 | todo |
| P3.7 Lists and tables | List items, tree and table views, headers | As P3.3 | todo |
| P3.8 Popups | Menus, popups, tooltips, dialogs | As P3.3 | todo |
| P3.9 Application sweep | Dolphin, Kate and Konsole checked window by window | Every breach of an anti-goal is fixed or listed as a known gap | todo |

P2.3 found these for Step 3, all drawn by the Breeze style or by Qt, not by
the colour scheme: the 1 px border under the header toolbar (P3.6); the
accent frame of a selected or current item and the lines between header
sections (P3.7); text fields drawn in tone 2 instead of a well, and a text
cursor that Qt draws inverted, so that on tone 2 it is the cool grey
`#dadde0` (P3.4, which decides whether the cursor becomes a known gap);
rounded corners everywhere (P3.2). Since D-95 a settings dialog's page
list, a View, is tone 2 on a tone 1 body, the reverse of a sidebar: P3.7
draws it as a sidebar.

P3.2 removed the border under the header toolbar, the accent frame of a
selected item, the lines between header sections and every rounded corner,
along with every other border and outline (D-98). Focus, which Breeze drew
with those borders, and the highlight of a selected tab now wait for their
family's plan. A line Qt draws itself stays: the grid of a table view
(P3.7). A menu was checked only as `render()` draws it; P3.8 sees one on
screen.

The style lives in `parts/union-style/amber/`, which started as an
unchanged copy of the Breeze style (D-96) and gets its tokens from
`contents/css/tokens.css` (D-97). It is not installed: each plan of Step 3 tries it in
P2.3's nested session, which finds it through `XDG_DATA_DIRS`, as the
[platform](../architecture/platform.md#tools-and-switches) document says.

## Step 4 — Terminal colours and editor theme

| Plan | Result | Done when | Status |
|---|---|---|---|
| P4.1 Terminal colours | `Amber.colorscheme` generated from the tokens | Konsole shows it; it matches the prototype's sample | todo |
| P4.2 Editor theme | Kate theme generated from the tokens | Kate shows it; it matches the prototype's sample | todo |

## Step 5 — Window decoration

| Plan | Result | Done when | Status |
|---|---|---|---|
| P5.1 Frame and title bar | Square frame with a tone 0 title bar and the window outline | Matches the prototype for active and inactive windows | todo |
| P5.2 Window buttons | Minimise, maximise, close in every state | Matches the prototype | todo |
| P5.3 Glow, shadow and window states | Window glow for the active window, shadow for an inactive one; maximised and tiled windows | Matches the prototype; no line but the window outline appears at any window edge in any state; a maximised window shows no outline, glow or shadow | todo |

## Step 6 — Packaging

| Plan | Result | Done when | Status |
|---|---|---|---|
| P6.1 Install and uninstall | One command each | Uninstall leaves no file behind | todo |
| P6.2 README | How to install, select (with KWin's border size), change a token; known gaps | A reader can do all three from the README alone | todo |
| P6.3 Acceptance check | Every line of "What success looks like" in the vision checked | Each line is confirmed or recorded as a known gap | todo |
