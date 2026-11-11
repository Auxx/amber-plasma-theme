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
| `colour` tool: `convert`, `contrast`, `solve`, using culori | Ported nearly as it is. It already measures layered, partly transparent colours, which the glow rule needs |
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
The only dependency is culori, pinned to an exact version.

## Planned tools

| Tool | Commands | Added in |
|---|---|---|
| `colour` | `convert`, `contrast <fg> <bg...> [--min]`, `solve` | P0.2 |
| `tokens` | `list`, `pairs`, `try <token=value...>` | P1.1 |
| `generate` | one command per part; prints the result, writes with `--write` | P2.2, then each later step |

A tool for taking screenshots of the prototype may be added if comparing the
prototype with a real application by eye proves too slow. It would need a
browser automation package, so it is added only when needed.

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
`references/tools.md` describes every tool and command. Both are written in
plan P0.2, with the first tool, and `CLAUDE.md` points to the skill from then
on.
