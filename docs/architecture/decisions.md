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
| D-21 | A selected item or tab carries an accent block marker, `--marker-width` wide and at least three pixels | Designer | A block is not a hairline. Changed on 2026-11-11, in P1.5, from "may carry": without the marker a selected item looks like a hovered one (both tone 3, 1.17:1 on tone 2), and the marker is what reaches 3:1 (6.54:1). The gallery shows a "No marker" candidate for the owner |
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
| D-48 | The prototype may hold a script only to copy a value into a custom property, such as a slider's fill. A script sets no colour and no class: `scriptOffences` allows it only the names a slider needs and the names it declares | Designer | A fill that does not follow a dragged thumb shows what Amber will not do, and CSS cannot read a range input's live value. 2026-11-11, P1.4 |
| D-49 | Popups (menus, combo box lists and tooltips) are tone 3 and carry a dark shadow offset downwards, drawn in the prototype as the window's shadow is. Whether Union draws it in Qt Widgets applications is answered in P3.8; if it cannot, the shadow is dropped or listed as a known gap | Designer | The design language gives popups depth, and the prototype shows a "No shadow" candidate beside it. 2026-11-11, P1.5 |
| D-56 | The terminal and editor backgrounds are tone 2, the window's main surface | Designer | Vision goal 7: the terminal and editor areas match the frame around them. The samples page shows tones 1 and 0 as candidates for the owner. 2026-11-11, P1.6 |
| D-57 | The syntax colours are the ANSI colours, by reference; ANSI yellow is the accent | Designer | Kate and Konsole share one palette of muted, warm-shifted hues (D-20), and a token changed once changes both. 2026-11-11, P1.6 |
| D-58 | The text selection is accent 14 % over tone 2 (`#3d362b`) | Designer | The current line already uses tone 3; more accent makes comments in dim text fail 4.5:1 on the selection (4.50:1 at 16 %). 2026-11-11, P1.6 |
| D-59 | The shadow of an inactive window is that of Breeze: black 55 %, on an eased fade 36 px long that starts inside the window, so that 9 px show above the window, 19 px beside it and 32 px below it. It replaces the starting shadow (black 50 %, a straight fade over 24 px) | Owner | 2026-11-12, P1.7. The starting shadow was "too harsh compared to Breeze. It should be barely noticeable and smaller"; of the candidate copied from Breeze: "looks perfect". Part of O-4 |
| D-60 | The window glow is accent 14 % at the window outline, on the same eased fade over 48 px, and has no contrast minimum. It replaces the starting glow (accent 28 %, a straight fade over 24 px) | Owner | 2026-11-12, P1.7. "The glow should be a faint indicator and paired with a window frame it looks good even if it fails WCAG test." Part of O-4 |
| D-61 | Following D-59 and D-60: the glow has no contrast pair; the eased curve is the one of an Aurorae copy of Breeze's shadow (nclarius, `ActiveAccentDawn`) and is written in `prototype/window.css`, not as tokens; a popup's shadow keeps its straight fade and shares `--shadow`, so it went from black 50 % to 55 % (replaced by D-67) | Designer | The owner set no minimum for the glow, so a pair would have nothing to check. The curve is a list of stops, which the tokens file does not hold; P5.3 gives it a home when the decoration is generated. The owner has not looked at popups yet (gallery, P1.7). 2026-11-12 |
| D-62 | The window outline is `#585248`, one pixel wide, the same for active and inactive windows. It is measured against the tones of a window, not against the window glow. It replaces the starting outline (tone 4). With D-59 and D-60 this closes O-4 | Owner | 2026-11-12, P1.7, seen over wallpapers the owner added to the prototype page: "I like **Outline: 2:1** example. The glow should not be used for contrast measurements." |
| D-63 | Following D-62: the pairs of `outline` on tones 0 to 2 have a minimum of 2, and the outline has no pair against the desktop | Designer | The owner chose the candidate built to reach 2:1 (it measures 2.38:1, 2.24:1 and 2.05:1), so 2 is the floor that keeps a later change of tone from weakening it. The desktop may be any wallpaper, so there is nothing fixed to measure against. 2026-11-12 |
| D-64 | A focused raised widget is accent 30 % over tone 4 (`#695c45`), the starting value. A focused unchecked toggle is accent 30 % over tone 1 (`#524733`); it replaces accent 16 % | Owner | 2026-11-12, P1.7, from the gallery's candidates: "Focused raised widget, **Start, 30 %** variant looks best"; "Focused toggle, **Accent 30 %** variant looks best". Part of O-3 |
| D-65 | The thumb of a slider follows the thumb of a scrollbar: lighter when hovered and lightest when pressed, as Breeze's sliders are. A slider's thumb at rest is lighter than tone 3, and a scrollbar's hovered and pressed thumb are darker than dim text and text | Owner | 2026-11-12, P1.7. The slider's thumb was "too dark at rest and is barely visible against background"; the scrollbar's "Hovered and Pressed feel too bright, At rest is good" |
| D-66 | Following D-65: one set of tokens for both thumbs, `--thumb` tone 4 (the scrollbar's, which the owner found good), `--thumb-hover` `#585248` and `--thumb-pressed` `#746e63`. `--scroll-thumb` is renamed `--thumb` | Designer | Two steps of warm neutral above tone 4, each about 1.5:1 from the one before, both well under dim text. The owner looks at them in the gallery. 2026-11-12 |
| D-67 | A popup has the shadow of an inactive window (D-59). It replaces the popup's own shadow of D-49 (a straight fade of 12 px, 4 px down); `--popup-shadow-size` and `--popup-shadow-offset` are gone. A tooltip's shadow is a third of the size, which is the designer's call | Owner | 2026-11-12, P1.7: popups' "shadows are not yet updated to match window decoration and look out of place". A tooltip is lower than the full shadow's insets |
| D-68 | A focused tab and a focused scroll area have a token of their own, `--surface-focus`, with the value they had as `--well-focus` (accent 16 % over tone 1) | Designer | The owner found focused tabs and views good and the focused well too light, so the well must be able to change without them. 2026-11-12, P1.7 |
| D-69 | A focused well keeps tone 1, below the surface, and carries a bar of accent three pixels high at its foot. It replaces the tint (accent 16 % over tone 1) | Owner | 2026-11-12, P1.7. "Inputs get too bright when focused and look 'raised' like buttons." The owner tried the candidate "Tone 1, accent edge" on the gallery's inputs ("That looks good"), then a bar of 2 px, and chose: "Let's go with 3px after all". Part of O-3 |
| D-70 | Following D-69: the focused well's tone has no contrast minimum against the well at rest or the surface, and the pair `well-focus on tone-0, tone-2` is gone; the bar carries the cue at 3:1. A spin box's step buttons stop above the bar | Designer | No tone that stays below the surface can reach the provisional 1.2 (1.10:1 at most), and the bar measures 8.40:1 on the well and 7.66:1 on the surface. A hovered or pressed step button would otherwise paint over the bar. 2026-11-12 |
| D-71 | The thumb tones of D-66 are approved: tone 4 at rest, `#585248` hovered, `#746e63` pressed | Owner | 2026-11-12, P1.7: "Thumb tones as shown in **Ranges** section look great" |
| D-72 | A selected item is tone 4, with the block marker. It replaces tone 3 | Owner | 2026-11-12, P1.7, from the gallery's candidates: "Selected item - **Lighter, tone 4** variant looks best". A selected item is now a tone above a hovered one |
| D-73 | Following D-72: a hovered selected item keeps tone 4 and does not change | Designer | Tone 4 was the hovered selected tone. A lighter one would drop the dim text of its second column below 4.5:1 (4.60:1 on tone 4 already). 2026-11-12 |
| D-74 | If Union cannot draw a shadow under a popup in a Qt Widgets application, a popup has no shadow, and that is acceptable | Owner | 2026-11-12, P1.7, on the gallery's "No shadow" candidate: "Yes, acceptable". Answers the "dropped or listed as a known gap" of D-49; P3.8 finds out whether it is needed |
| D-75 | An empty well, an unchecked toggle and an empty track keep their starting tone, tone 0, and are told from the surface by tone alone, with no bar and no lighter fill. Amber accepts that they do not reach the 3:1 of WCAG 1.4.11. This closes O-1 | Owner | 2026-11-12, P1.7, after the meaning of the candidates was explained: "Yes, keep the start." Earlier the owner had said that inputs, toggles and ranges look good, and a bar under every well would weaken the focus bar of D-69 |
| D-76 | A primary button and a checked toggle show focus with their hovered tone and have no focused tone of their own. With D-64 and D-69 this closes O-3 | Owner | 2026-11-12, P1.7: "primary button looks good as shown in **Buttons** section. Yes, let's keep things as they are." Both are already accent, so a tint of accent cannot mark them |
| D-77 | Following D-75 and D-76: the well edge is removed (`--well-edge`, `--well-edge-width`, its pair and its glossary entry). The floors stay and are no longer provisional: 1.1 for `well`, `toggle`, `track` and the thumbs on their surfaces, 1.2 for `raised-focus`, `toggle-focus` and `surface-focus` | Designer | A candidate that was not chosen leaves no token behind. The floors are not WCAG rules; they stop a later change of tone from fading a step the owner approved. 2026-11-12 |

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
| O-5 | Light text on an ANSI colour used as a background (Midnight Commander's blue panels, powerline prompts, some `ls` colours) measures 1.62:1 to 1.88:1 for text and 1.84:1 to 2.13:1 for bright white, because the ANSI colours are light enough to carry text on the dark terminal. Accept it as a known gap, or darken the normal colours so that they work both ways, at the cost of their contrast as text? Found in P1.6 (2026-11-11); to be weighed by the owner in P1.7 or P4.1. See [accessibility](accessibility.md), rule 3 | Owner |
