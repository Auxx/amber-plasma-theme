# Amber — Tooling

> Status: **Accepted** on 2026-11-11

Amber keeps a small set of command-line tools in `tools/`, written for the
agent and the owner. They replace scripts that would otherwise be written,
run once and thrown away: measuring contrast, checking tokens, generating the
parts.

The approach is taken from the `ai-tools` skill of the owner's `front-burner`
project, which was read on 2026-11-11.

## What is taken from front-burner

| From front-burner | In Amber |
|---|---|
| `colour` tool: `convert`, `contrast`, `solve`, using culori | Ported nearly as it is. It already measures layered, partly transparent colours, which tones tinted with accent need |
| `tokens` tool: `list`, `resolve`, `pairs`, `try` | Same commands, with a new reader: Amber's tokens are CSS custom properties, not SCSS maps, and there is one colour scheme, not two |
| Contrast pairs declared in a model file, checked in the unit tests | Same idea; the pairs sit next to the tokens |
| "Close" margin of 2 % | Kept as a warning. In front-burner it covers the gap between the tool and a browser measurement; Amber has no second measurement yet |
| `cli.mjs`: commands, `--help`, `--json`, exit codes | Ported as it is |
| The skill: a short `SKILL.md` and a reference of every tool | Same shape, in `.claude/skills/ai-tools/` |
| The rules for adding and maintaining a tool | Kept; see below |

Not taken: the Storybook, icon, Nx, typing and memory tools, which belong to
that project. A tool for numbering document IDs is not needed while Amber's
documents have few IDs.

Differences (my call): Amber is not an Nx workspace, so tools are run with
`node` and tested with Node's own test runner, which needs no extra package.
The dependencies are culori and playwright-core, each pinned to an exact
version.

## Planned tools

| Tool | Commands | Added in |
|---|---|---|
| `colour` | `convert`, `contrast <fg> <bg...> [--min]`, `solve` | P0.2 |
| `tokens` | `list [filter]`, `resolve <token...> [--set]`, `pairs [filter] [--failing] [--close] [--set]`, `try <token=value...>` | P1.1 |
| `browser` | `shot <page> [--selector] [--hover] [--focus] [--press] [--scrollbars] [--wait]`, `check <page>`, `colours <page> <selector>`, `states <page> --widget --selector` | P0.7; `--scrollbars` P1.4; `--wait` P1.5; `states` P3.3; placeholder P3.4 |
| `generate` | one command per part, each printing the result and writing with `--write`: `colour-scheme [--write]`, `union-style-tokens [--write]`, `terminal-colours [--write]`, `editor-theme [--write]`, `decoration [--write]`; `--set token=value` prints a trial | P2.2, then each later step; `union-style-tokens` P3.2; `terminal-colours`, `--set` P4.1; `editor-theme` P4.2; `decoration` P5.1, its window buttons P5.2, its window glow and shadow P5.3 |
| `sample` | `terminal [--file]`: the prototype's terminal sample with ANSI escapes; `editor [--file]`: its editor sample as plain text; `compare-editor <html>`: the highlighter's colours of it against the prototype's tokens | P4.1; `editor`, `compare-editor` P4.2 |
| `image` | `greys <png> [--region] [--leave-out]... [--token-blends] [--mark]`, `colours <png> [--region] [--top]`, `frame <png> --surface [--region]`, `lines <png> [--region] [--leave-out]... [--min-length] [--blends]`, `states <folder> --case --expect [--alias] [--ignore] [--foot --bar --bar-states]`, `profile <png> --from --to`, `light <png> --from --to --over --state (--side \| --corner) [--scale] [--tolerance]` | P2.3; `frame` P3.2; `states` P3.3; `--foot`, `--bar`, `--ignore` P3.4; `--leave-out`, `lines` P3.9; `--token-blends` P4.1; `profile` P5.1; `light` P5.3 |

The `browser` tool opens the prototype in the installed Google Chrome through
playwright-core, which downloads no browser of its own (D-45, D-46). It is
for checks by eye, in any state of a widget, and for the anti-goals as the
browser draws them, which the checks of the source cannot see.

## Rules for every tool

1. **Look for a tool before writing a script.** If one does almost what is
   needed, extend it.
2. **Logic in `tools/src/lib/`, the command line in `tools/src/bin/`.** Plain
   JavaScript modules, no build step.
3. **Plain text for reading; `--json` for feeding another step.**
4. **Exit codes:** 0 success; 1 a check failed or an error occurred; 2 the
   command line was wrong.
5. **Change nothing without `--write`.** A tool that writes files prints what
   it would write first.
6. **Paths stay inside the repository.** A tool never writes to the owner's
   home folder or the system; installing is the install script's job.
7. **Read the real sources; do not copy them.** The tokens file is parsed,
   never duplicated. A parser fails loudly on input it does not understand.
8. **Test the logic** with specs next to it.
9. **Document it** in the skill's reference in the same change as the code.
10. **When a tool's answer looks wrong, fix the tool** and add a spec for the
    case.

## The skill

`.claude/skills/ai-tools/SKILL.md` says how to use, add and maintain tools;
`references/tools.md` describes every tool and command. `CLAUDE.md` points to
the skill.
