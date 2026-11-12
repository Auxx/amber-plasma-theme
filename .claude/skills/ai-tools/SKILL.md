---
name: ai-tools
description: |
  Ready-made command-line tools for jobs that would otherwise need a
  throwaway script: colour conversion, WCAG contrast, checking Amber's tokens
  and contrast pairs, and opening the prototype in Chrome (screenshots in a
  hovered, focused or pressed state, the rendered anti-goal check, computed
  colours named as tokens), and generating Amber's parts (the colour
  scheme now, the others to follow). Use
  BEFORE writing any one-off script (node -e, python, a heredoc in the
  scratchpad) to compute, check, look at or generate something in this
  repository, and when a task needs a tool that does not exist yet: this
  skill says how to add one.
---

The repository has a folder of tools written for the agent and the owner:
`tools/`. Each tool is a small command-line program with a few commands. They
replace scripts that were otherwise written, run once and deleted.

Every tool and command is described in
[references/tools.md](references/tools.md). Read it to find the right tool.

## Use a tool

1. Look for a tool in [references/tools.md](references/tools.md) before you
   write a script. If one does almost what you need, extend it (see "Add or
   change a tool") rather than writing a script next to it.
2. Run it from the repository root:

   ```shell
   node tools/src/bin/<tool>.mjs <command> [arguments] [options]
   ```

   `--help` after a tool lists its commands; after a command it explains its
   arguments and options.
3. Read the result:
   - Output is plain text for reading. `--json` prints JSON instead, for when
     the result feeds another step.
   - Exit code 0 means success, 1 means a check failed or an error occurred
     (the message says which), and 2 means the command line was wrong (the
     usage is printed).

Rules that hold for every tool are in
[docs/architecture/tooling.md](../../../docs/architecture/tooling.md), under
"Rules for every tool". The ones that matter when using a tool:

- **Paths stay inside the repository.** A tool never writes to the home
  folder or the system; installing is the install script's job.
- **A tool that changes files prints the changes first** and writes only
  with `--write`. `generate <part> --write` is the one that does so far.

## Add or change a tool

Add a tool when you are about to write a script that you, or a later session,
would write again: anything general enough to have arguments. A truly one-off
step, such as a single edit, is still done with the normal editing tools.

The tools are plain JavaScript (ES modules, `.mjs`), with no build step:

```text
tools/
  package.json            the test script; culori is the only dependency
  src/
    bin/<tool>.mjs        entry point: commands, options, output only
    bin/<tool>.spec.mjs   specs that run the tool as a program
    lib/<tool>.mjs        the logic, as pure functions where possible
    lib/<tool>.spec.mjs   specs of the logic
    lib/cli.mjs           runCli/main, print, table, UsageError
```

1. **Put logic in `src/lib/`, the command line in `src/bin/`.** An entry
   point calls `main({ name, summary, commands })` from `cli.mjs`. Each
   command has `usage`, `summary`, optional `help`, `options` (a `node:util`
   `parseArgs` options object) and `run(values, positionals)`, which prints
   its output and returns the exit code. Throw `UsageError` for a wrong
   command line, including an option that should be a number and is not.
   Offer `--json` on every command. Extend an existing tool with a new
   command when the job belongs to it.
2. **Follow the rules** in
   [docs/architecture/tooling.md](../../../docs/architecture/tooling.md).
3. **Test it first.** Write the specs before the code, with `node:test` and
   `node:assert/strict`, and watch them fail. Run every spec with:

   ```shell
   npm --prefix tools test
   ```

4. **Dependencies.** Prefer Node's standard library. A new package needs the
   owner's agreement and is pinned to an exact version in
   `tools/package.json`.
5. **Document it.** Add or update the tool's section in
   [references/tools.md](references/tools.md), and the table of planned tools
   in `docs/architecture/tooling.md`, in the same change as the code. This
   file (`SKILL.md`) stays generic: change it only when the way all tools
   work changes.

## Maintain the tools

- When a tool's result looks wrong, fix the tool rather than working around
  it with a script, and add a spec for the case.
- A tool that reads a source file, as the `tokens` tool will read the tokens
  file, must fail with a message naming the file and line when the format
  changes. Update the parser and its specs then.
- Remove a tool or command that is no longer needed, together with its specs
  and its section in the reference.
