# Amber — Decisions

> Status: **Accepted** on 2026-11-11

Every decision that shapes Amber, who made it, and why. "Owner" means the
owner said so. "Designer" means it was chosen for them and is open to change.

When a decision changes, edit its row and note the date; do not leave the old
text in other documents.

## Product

| ID | Decision | By | Why |
|---|---|---|---|
| D-1 | Dark theme in warm tones, minimalist | Owner | Breeze is neutral to cool |
| D-2 | Square corners everywhere. A widget that is a circle by convention, such as a radio button or a round button, stays a circle: it has no corners to round | Owner | Second sentence added on 2026-11-11 |
| D-3 | No hairlines; separation by tone, as in JetBrains Islands. The window outline (D-25) is the one exception | Owner | Second sentence added on 2026-11-11 |
| D-4 | Hovered, focused and pressed widgets are shown by a change of tone alone. Nothing glows, and there is no outline. This holds for every part, the window decoration included, so that Amber is consistent | Owner | Changed on 2026-11-11. It was "a glow, not an outline"; spikes P0.3 and P0.5 showed that Union cannot draw a glow in Qt Widgets applications. The exact tones are settled in the prototype |
| D-5 | Widgets styled through Union | Owner | |
| D-6 | Window decoration and widgets are both in scope | Owner | |
| D-7 | Breeze icons and the Noto font stay | Owner | |
| D-8 | Dark first; no light variant yet | Owner | The owner uses dark mode |
| D-9 | An HTML and CSS prototype for trying changes | Owner | No change to system settings while developing |
| D-10 | The Sand direction: stone surfaces, muted gold accent | Owner | Chosen from three mockups, 2026-11-10 |
| D-11 | Judged in Dolphin, Kate and Konsole; Vivaldi and WebStorm are out | Owner | They are the owner's daily Qt applications |
| D-12 | Terminal colours and an editor theme are included | Owner | Otherwise a Breeze-coloured terminal and editor sit in an Amber frame |
| D-13 | Rounded corners, hairlines and cool greys are failures. A round widget (D-2) is not a rounded corner, and the window outline (D-25) is not a failure | Owner | Second sentence added on 2026-11-11, and widened the same day for D-25 |
| D-14 | Contrast is checked against WCAG | Owner | Accessibility; 2026-11-11 |
| D-15 | Living documentation in `docs/product` and `docs/architecture`, with `CLAUDE.md` as the guide | Owner | 2026-11-11 |
| D-16 | Each step is planned as several small plans | Owner | Easier to build and test; 2026-11-11 |
| D-17 | The product is named Amber, identifier `amber` | Designer | From the folder name |
| D-18 | Plasma shell, GTK, login screen, splash screen, cursors, a global theme package and the KDE Store are out | Designer | Keeps the first version small |
| D-19 | Starting values of tones, text, accent, danger and on-danger | Designer | From the Sand mockup; tuned in the prototype. On-danger was added on 2026-11-11 because text on danger measures 4.29:1 |
| D-20 | Terminal and syntax colours are muted, warm-shifted hues, approved in the prototype | Designer | They must sit with Sand |
| D-21 | A selected item may carry an accent block marker at least three pixels wide | Designer | A block is not a hairline |
| D-22 | Amber carries the MIT licence | Owner | 2026-11-11. The Union style starts from BSD-2-Clause code, whose notices are kept |
| D-23 | "Part" is the word for one of the things Amber installs | Owner | 2026-11-11 |
| D-24 | Developing Amber must not need a change to the owner's system settings | Owner | Stated with D-9 |
| D-25 | A window has a thin outline along every edge, as Breeze's decoration has. It is the one exception to D-3 and D-13 | Owner | 2026-11-11, on seeing the windows of spike P0.4: without it, windows that overlap cannot be told apart. Accessibility and usability come before the rule |

## Architecture

| ID | Decision | By | Why |
|---|---|---|---|
| D-30 | The prototype's tokens file is the single source of colours and sizes | Designer | One place to change a value |
| D-31 | The parts are generated from the tokens by a tool | Designer | They cannot fall behind; fits the tooling approach |
| D-32 | The Union style starts as a copy of the Breeze style and is changed file by file | Designer | The Breeze style covers every widget already |
| D-33 | The Union style reads colours from the colour scheme where a role exists | Designer | As Breeze does; applications' own colours then agree with it |
| D-34 | The window decoration is an Aurorae theme | Designer | No compiled code |
| D-35 | The prototype is plain HTML and CSS, opened from disk, with no build step | Designer | Fast to change; nothing to install |
| D-36 | The prototype uses only effects Union can draw in Qt Widgets applications: flat colours, and no shadow on a widget | Designer | It must not promise what the system cannot draw. Changed on 2026-11-11 after spike P0.3 |
| D-37 | Two spikes run before the prototype is approved: widget glow, square decoration | Designer | Both are goals that the platform might not allow |
| D-38 | A failed glow, or a decoration that cannot be square, goes back to the owner | Designer | The fallback changes what Amber is |
| D-39 | Withdrawn on 2026-11-11: it was about a decoration without button glow, and Amber has no glow (D-4) | Designer | |
| D-40 | Nothing is written under `/usr`; everything installs to the home folder | Designer | Easy to remove |
| D-41 | Tools follow the `ai-tools` approach of `front-burner`; `colour` is ported | Designer | Asked for by the owner to be assessed; it fits |
| D-42 | Tools are tested with Node's own test runner; culori is the only dependency | Designer | No workspace tooling is needed here |

## Accessibility

| ID | Decision | By | Why |
|---|---|---|---|
| D-50 | WCAG 2.2 level AA is the measure | Designer | The current version; AA is the usual target |
| D-51 | All text reaches 4.5:1; the 3:1 for large text is not used | Designer | Simpler, and stricter |
| D-52 | Accent reaches 3:1 against every tone it marks | Designer | WCAG 1.4.11 |
| D-53 | Terminal and syntax colours reach 4.5:1; ANSI black is exempt | Designer | They are text |
| D-54 | Withdrawn on 2026-11-11 with the glow: it set a 3:1 target for the focused glow. What the focused tone must reach is open question O-3 | Designer | |
| D-55 | Tonal separation between surfaces is exempt from 3:1 | Designer | It is the purpose of Amber, and WCAG does not ask for it |

## Open

| ID | Question | Whose |
|---|---|---|
| O-1 | Controls identified only by tone (empty text field, unchecked check box, slider track) do not reach 3:1. Which tones and gaps do they get? Deferred by the owner on 2026-11-11 to the prototype, where the tones can be seen: plans P1.3 and P1.4 show candidates, and the owner decides in P1.7. See [accessibility](accessibility.md) | Owner |
| O-3 | How strong must the focused tone be? The owner said on 2026-11-11 that the exact tones of every state are worked out in step 1, and that the sample of spike P0.5 is not held to WCAG. Plan P1.3 shows candidates with their measured contrast, and the owner decides in P1.7. See [accessibility](accessibility.md) | Owner |
| O-4 | The window outline's colour and width, for active and inactive windows, and the contrast it must reach against the windows and the desktop behind it. Plan P1.2 shows candidates with their measured contrast, and the owner decides in P1.7. See the [design language](design-language.md) | Owner |
