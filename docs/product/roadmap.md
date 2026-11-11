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

P0.4 was written when the decoration was to have no line at all. The spike
showed a square title bar with no border line; on seeing it the owner
decided that a window has a window outline: D-25 in the
[decisions](../architecture/decisions.md).

P0.3 is done by its second clause: the glow cannot be drawn in Qt Widgets
applications, and the reason is in the platform document. After P0.5 the
owner decided that Amber has no glow: D-4 in the
[decisions](../architecture/decisions.md).

The folders of the repository layout are not created empty: each appears with
its first file, in the plan that fills it.

P0.3, P0.4 and P0.5 are spikes: their code is thrown away and their findings go into
[platform](../architecture/platform.md). A failed spike goes back to the owner
before the next step.

## Step 1 — Prototype

The gate for everything after it: the owner approves the look here.

| Plan | Result | Done when | Status |
|---|---|---|---|
| P1.1 Tokens and contrast pairs | Tokens file, contrast pairs, `tokens` tool | `tokens pairs` runs in the tests and every pair passes | todo |
| P1.2 Window shell | Mock file-manager window: title bar, toolbar, sidebar, list, status area; a second window behind it, with candidates for the window outline | The page opens from disk and shows every surface by tone alone; the two windows can be told apart where they overlap | todo |
| P1.3 Gallery: buttons and inputs | Buttons, tool buttons, combo boxes, text fields, spin boxes, text areas in every state | Each state is shown side by side and reacts to pointer and keyboard | todo |
| P1.4 Gallery: toggles and ranges | Check boxes, radio buttons, sliders, progress bars, scrollbars | As P1.3 | todo |
| P1.5 Gallery: navigation, views and popups | Tabs, list items, tree and table views with headers, menus, popups, tooltips, a dialog | As P1.3 | todo |
| P1.6 Terminal and code samples | Terminal colours and syntax colours shown on real-looking samples | Every colour except ANSI black, which is exempt, has a contrast pair and passes | todo |
| P1.7 Owner review | Tuned values; the owner's choices for the open questions O-1, O-3 and O-4 | The owner approves the prototype and O-1, O-3 and O-4 are closed in the decisions | todo |

P1.3 and P1.4 show text fields, check boxes, radio buttons and slider tracks
with candidate tones and their measured contrast side by side, so that the
owner can decide O-1 by eye in P1.7. They show the focused tone the same
way, for O-3. P1.2 shows the window outline the same way, for O-4, and the
owner decides it in P1.7 too.

## Step 2 — Colour scheme

| Plan | Result | Done when | Status |
|---|---|---|---|
| P2.1 Role mapping | Table of which token feeds which colour-scheme role | Every role of a `.colors` file has a token or a written rule | todo |
| P2.2 Generator | `Amber.colors` generated from the tokens | Running the generator twice gives the same file; tests pass | todo |
| P2.3 Check in applications | The scheme seen in Dolphin, Kate and Konsole | No cool grey is visible; findings are written down | todo |

## Step 3 — Union style

One widget family per plan, each checked in a real application before the
next starts.

| Plan | Result | Done when | Status |
|---|---|---|---|
| P3.1 Skeleton | A copy of the Breeze style installed as `amber` | One application runs with it without changing system settings | todo |
| P3.2 Global rules | Radius zero, borders removed, variables for the tones of each state | No rounded corner or outline on the widgets not yet restyled | todo |
| P3.3 Buttons | Buttons, tool buttons, combo boxes | Matches the prototype in every state | todo |
| P3.4 Text inputs | Text fields, spin boxes, text areas | As P3.3 | todo |
| P3.5 Toggles and ranges | Check boxes, radio buttons, sliders, progress bars | As P3.3 | todo |
| P3.6 Bars | Toolbars, menu bar, status bar, tab bars, scrollbars | As P3.3 | todo |
| P3.7 Lists and tables | List items, tree and table views, headers | As P3.3 | todo |
| P3.8 Popups | Menus, popups, tooltips, dialogs | As P3.3 | todo |
| P3.9 Application sweep | Dolphin, Kate and Konsole checked window by window | Every breach of an anti-goal is fixed or listed as a known gap | todo |

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
| P5.3 Shadow and window states | Drop shadow; maximised and tiled windows | No line but the window outline appears at any window edge in any state; a maximised window shows none | todo |

## Step 6 — Packaging

| Plan | Result | Done when | Status |
|---|---|---|---|
| P6.1 Install and uninstall | One command each | Uninstall leaves no file behind | todo |
| P6.2 README | How to install, select (with KWin's border size), change a token; known gaps | A reader can do all three from the README alone | todo |
| P6.3 Acceptance check | Every line of "What success looks like" in the vision checked | Each line is confirmed or recorded as a known gap | todo |
