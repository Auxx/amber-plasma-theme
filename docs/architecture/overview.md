# Amber — Architecture overview

> Status: **Accepted** on 2026-11-11

This is the entry point to the architecture documents. Words in this document
are used as the [glossary](../product/glossary.md) defines them.

| Document | Holds |
|---|---|
| [design-language.md](design-language.md) | The look: tokens, tones, states and shadow rules |
| [accessibility.md](accessibility.md) | Contrast rules, what is checked and how |
| [colour-scheme.md](colour-scheme.md) | Which token or rule each role of the colour scheme takes, and how that is checked |
| [platform.md](platform.md) | Facts about Union, Aurorae, Konsole and Kate on the target system; open questions and spike findings |
| [tooling.md](tooling.md) | The command-line tools and the rules for adding one |
| [decisions.md](decisions.md) | Every decision, who made it, and why |

## How it fits together

```text
                 prototype/tokens.css   (the single source of the look)
                          |
          +---------------+-----------------------------+
          |               |                             |
     prototype       tools: tokens pairs           tools: generate
   (browser, by      (contrast check, in                |
    eye)              the tests)                        |
                                    +----------+--------+--------+-----------+
                                    |          |        |        |           |
                              colour scheme  Union   window   terminal    editor
                              Amber.colors   style   decoration colours   theme
                                    |          ^
                                    +----------+
                          the style reads its colours
                          from the active colour scheme
```

- **Tokens are the single source.** A colour or size is changed in the tokens
  file and nowhere else. (my call)
- **The prototype reads the tokens directly**, so a change shows in the
  browser at once.
- **The parts are generated from the tokens** by a tool, so they cannot fall
  behind. Content of a part that is not a value, such as the Union style's
  rules, is written by hand and refers to values by name. A generated part is
  committed beside the hand-written files it comes from, and a test fails when
  it is stale (D-92). (my call; the exact split is settled in the plans of
  each step)
- **The Union style takes its colours from the colour scheme** wherever the
  scheme has a matching role, as the Breeze style does. Tones the scheme
  cannot express are defined in the style's own variables, generated from the
  tokens.
- **Contrast is checked from the tokens**, before anything is generated.

## The parts

| Part | Format | Installed to | Selected in |
|---|---|---|---|
| Colour scheme | `Amber.colors` (INI) | `~/.local/share/color-schemes/` | System Settings → Colours |
| Union style | folder: `metadata.json`, `contents/css/` | by `union-styletool install` | see [platform](platform.md) |
| Window decoration | Aurorae theme folder | `~/.local/share/aurorae/themes/` | System Settings → Window Decorations |
| Terminal colours | `Amber.colorscheme` (INI) | `~/.local/share/konsole/` | Konsole profile → Appearance |
| Editor theme | `.theme` (JSON) | `~/.local/share/org.kde.syntax-highlighting/themes/` | Kate → Settings → Colour Themes |

Every part is shown to the user as "Amber". The colour scheme and the
terminal colours are identified by their file names; the parts that carry an
identifier of their own, such as the Union style, use `amber`. (my call)

## Repository layout (my call)

```text
CLAUDE.md
README.md
docs/
  product/            vision, glossary, roadmap
  architecture/       this folder
  superpowers/        dated design records and plans
prototype/            index.html, gallery.html, samples.html, tokens.css, contrast-pairs.json, stylesheets, gallery.js (D-48)
parts/
  colour-scheme/      roles.json: the token or rule of each role (P2.1); Amber.colors, generated (P2.2)
  union-style/        amber/: the Union style, a copy of the Breeze style 6.8.2 (P3.1)
  decoration/
  terminal-colours/
  editor-theme/
tools/                command-line tools and their tests
scripts/              install and uninstall
.claude/skills/       skills for the agent, such as ai-tools
```

## Rules that hold everywhere

- **No change to system settings during development.** Trying a part in one
  launched application is fine. Switching the system-wide colour scheme, style
  or decoration is the owner's action. (decided, D-24)
- **Nothing is written under `/usr`.** Every part installs to the owner's
  home folder and is removed by the uninstall script.
- **The anti-goals are checked at every plan**, not only at the end: no
  rounded corner, no hairline but the window outline, no cool grey.
- **A breach that cannot be fixed becomes a known gap**, written in the
  README.
- **Unverified facts are marked as such** in [platform](platform.md) and are
  tested before anything is built on them.
