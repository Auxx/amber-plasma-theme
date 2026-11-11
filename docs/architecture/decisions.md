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
| D-4 | Hovered, focused and pressed widgets are shown by a change of tone alone. No widget glows, and no widget gets an outline to show a state. This holds for every part, the window buttons of the decoration included, so that Amber is consistent. The window outline (D-25) shows no state, and the window glow (D-26) belongs to the window, not to a widget | Owner | Changed on 2026-11-11. It was "a glow, not an outline"; spikes P0.3 and P0.5 showed that Union cannot draw a glow in Qt Widgets applications. The exact tones are settled in the prototype |
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
| D-19 | Starting values of tones, text, accent, danger and on-danger | Designer | From the Sand mockup; tuned in the prototype. On-danger was added on 2026-11-11 because text on danger measures 4.29:1. Dim text was lightened from `#9c958a` to `#a9a297` on 2026-11-11, in P1.1, to reach 4.5:1 on tone 4 |
| D-20 | Terminal and syntax colours are muted, warm-shifted hues, approved in the prototype | Designer | They must sit with Sand |
| D-21 | A selected item may carry an accent block marker at least three pixels wide | Designer | A block is not a hairline |
| D-22 | Amber carries the MIT licence | Owner | 2026-11-11. The Union style starts from BSD-2-Clause code, whose notices are kept |
| D-23 | "Part" is the word for one of the things Amber installs | Owner | 2026-11-11 |
| D-24 | Developing Amber must not need a change to the owner's system settings | Owner | Stated with D-9 |
| D-25 | A window has a thin window outline, like the thin border of Breeze's decoration. It is the one exception to D-3 and D-13 | Owner | 2026-11-11, on seeing the windows of spike P0.4: without it, windows that overlap cannot be told apart. Accessibility and usability come before the rule |
| D-26 | The active window has a window glow in accent. An inactive window has a dark shadow in its place | Owner | 2026-11-11, on seeing the live windows of spike P0.6, which the owner asked for: "since we need a window outline, let's also try if we can have a subtle glow around windows" |

## Architecture

| ID | Decision | By | Why |
|---|---|---|---|
| D-30 | The prototype's tokens file is the single source of colours and sizes | Designer | One place to change a value |
| D-31 | The parts are generated from the tokens by a tool | Designer | They cannot fall behind; fits the tooling approach |
| D-32 | The Union style starts as a copy of the Breeze style and is changed file by file | Designer | The Breeze style covers every widget already |
| D-33 | The Union style reads colours from the colour scheme where a role exists | Designer | As Breeze does; applications' own colours then agree with it |
| D-34 | The window decoration is an Aurorae theme | Designer | No compiled code |
| D-35 | The prototype is plain HTML and CSS, opened from disk, with no build step. Since P1.4 a page may also link a script that only copies a value into a custom property (D-48) | Designer | Fast to change; nothing to install |
| D-36 | The prototype uses only effects Union can draw in Qt Widgets applications: flat colours, and no shadow on a widget | Designer | It must not promise what the system cannot draw. Changed on 2026-11-11 after spike P0.3 |
| D-37 | Two spikes run before the prototype is approved: widget glow, square decoration | Designer | Both are goals that the platform might not allow |
| D-38 | A decoration that cannot be square goes back to the owner | Designer | The fallback changes what Amber is. Changed on 2026-11-11: the glow is gone (D-4) and the decoration has a window outline (D-25) |
| D-39 | Withdrawn on 2026-11-11: it was about a decoration without button glow, and no widget glows (D-4) | Designer | |
| D-40 | Nothing is written under `/usr`; everything installs to the home folder | Designer | Easy to remove |
| D-41 | Tools follow the `ai-tools` approach of `front-burner`; `colour` is ported | Designer | Asked for by the owner to be assessed; it fits |
| D-42 | Tools are tested with Node's own test runner; culori and playwright-core are the only dependencies | Designer | No workspace tooling is needed here. playwright-core added on 2026-11-11, P0.7 |
| D-43 | Tokens are CSS custom properties without a prefix (`--tone-0`, `--text-dim`) in one `:root` block of `prototype/tokens.css`; their contrast pairs are in `prototype/contrast-pairs.json` beside it | Designer | The prototype reads the tokens as they are; JSON lets each pair carry its reason. 2026-11-11, P1.1 |
| D-44 | A token may also be a length in px, or a part-transparent colour written `color-mix(in srgb, var(--token) N%, transparent)` | Designer | The decoration needs sizes, and the window glow must follow accent rather than copy its value. 2026-11-11, P1.2 |
| D-45 | The prototype is opened in a browser by a tool built on Playwright, in `tools/` | Owner | 2026-11-11: the owner cannot install the Chrome extension, and pictures without states cannot show hovered, focused or pressed tones |
| D-46 | `playwright-core` drives the installed Google Chrome; no browser is downloaded, and Firefox is not driven | Designer | Nothing is installed beyond one npm package; Chrome 157 verified on 2026-11-11, P0.7 |
| D-47 | Widget tones that are not tones, such as the focused tones, are opaque tokens; a mix they come from is written in the token's comment, not as `color-mix` with a second colour | Designer | The colour scheme and the Union style need plain colours, and the tokens reader stays as small as D-44 left it. 2026-11-11, P1.3 |
| D-48 | The prototype may hold a script only to copy a value into a custom property, such as a slider's fill. A script sets no colour and no class, and `scriptOffences` checks it | Designer | A fill that does not follow a dragged thumb shows what Amber will not do, and CSS cannot read a range input's live value. 2026-11-11, P1.4 |

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
| O-1 | Controls identified only by tone (empty text field, unchecked check box, slider track) do not reach 3:1. Which tones and gaps do they get? Deferred by the owner on 2026-11-11 to the prototype, where the tones can be seen: plans P1.3 and P1.4 show candidates, and the owner decides in P1.7. The text field's candidates are on `prototype/gallery.html` since P1.3, and those of the unchecked toggle and the track since P1.4. Found there: no darker well passes 1.33:1 on tone 2 (black reaches 1.33), so a stronger cue is lighter than the surface or is a well edge; and a track at 3:1 drops the fill on it to 2.45:1, so the track cannot carry a 3:1 cue by itself. See [accessibility](accessibility.md) | Owner |
| O-3 | How strong must the focused tone be? The owner said on 2026-11-11 that the exact tones of every state are worked out in step 1, and that the sample of spike P0.5 is not held to WCAG. Plan P1.3 shows candidates with their measured contrast, on `prototype/gallery.html`, and the owner decides in P1.7. Found there: a placeholder in dim text caps the tint of a focused well near 20 % (rule 4 of [accessibility](accessibility.md)). Since P1.4 the gallery also shows the focused toggle, which holds no text and so is not capped: its tint reaches 3:1 against tone 2 at 60 %. Part of the question: the primary button and a checked toggle show focus with their hovered tone for now. See [accessibility](accessibility.md) | Owner |
| O-4 | The window outline's colour and width, for active and inactive windows, and the contrast it must reach against the windows and the desktop behind it; with it, how wide and how strong the window glow and the inactive window's shadow are. The candidates are on the prototype page (`prototype/index.html`) since P1.2, each with its measured contrast, and the owner decides in P1.7. Part of the question: on the active window the outline lies between the window and its own glow, and the starting outline measures 1.14:1, 1.22:1 and 1.34:1 against the glow over tones 0, 1 and 2, below the provisional 1.3 on tone 0. Is the outline measured against the bare tones only, as now, or against the glow too? See the [design language](design-language.md) | Owner |
