# Amber

**Amber** is a dark, warm, borderless theme for KDE Plasma 6, made of several
parts: a colour scheme, a Union style for widgets, a window decoration,
terminal colours for Konsole and an editor theme for Kate. An HTML and CSS
prototype holds the tokens that every part is generated from.

## Always-relevant context

@docs/product/glossary.md

Use the glossary's words in documents, code, commit messages and replies. KDE
calls many different things a "theme" or a "style"; the glossary says which
word Amber uses for each.

## Knowledge base (read when relevant)

- Vision: `docs/product/vision.md` — what Amber is, why, goals, non-goals,
  anti-goals and what success looks like.
- Roadmap: `docs/product/roadmap.md` — the steps, the small plans of each
  step, and their status.
- Architecture: `docs/architecture/overview.md` — entry point: how the
  tokens, the prototype, the tools and the parts fit; repository layout;
  rules that hold everywhere.
- Design language: `docs/architecture/design-language.md` — tones, states
  and shadow rules.
- Accessibility: `docs/architecture/accessibility.md` — the WCAG contrast
  rules, the contrast pairs and how they are checked.
- Platform: `docs/architecture/platform.md` — verified and unverified facts
  about Union, Aurorae, Konsole and Kate on the target system; spike
  findings.
- Tooling: `docs/architecture/tooling.md` — the command-line tools and the
  rules for adding one.
- Decisions: `docs/architecture/decisions.md` — every decision, who made it
  and why (IDs D-n); open questions (IDs O-n).
- Design records: `docs/superpowers/specs/` — dated records of design
  sessions. They are history; the documents above are the truth.
- Plans: `docs/superpowers/plans/` — one file per small plan.

## How to use the documentation

The documents are living: they describe Amber as it is and as it is meant to
be now, not how it got there.

- **Read before acting.** Before working on a part, the prototype or a
  tool, read the overview and the documents it points to.
- **Update in the same change.** When work changes what a document says,
  change the document with it. A value in the tokens file wins over a value
  in a document; fix the document.
- **Record decisions.** A new decision gets a row in `decisions.md`, marked
  as the owner's or the designer's. Mark your own choices "(my call)" in
  other documents. Never present a choice of yours as the owner's.
- **Record facts about the platform with their status.** A fact seen on the
  machine is "verified" with its date; anything else is "unverified" and is
  tested before being built on. Spike findings go into `platform.md`.
- **One home per fact.** State a rule or value in one document and link to it
  from the others.
- **New terms go into the glossary first.**
- **Keep the roadmap's statuses true.**

## Working rules

- **Never change the owner's system settings.** Do not switch the system's
  colour scheme, widget style or window decoration, and do not edit files
  under `~/.config` to do so. Trying a part in one launched application is
  fine. Ask the owner to switch settings themselves.
- **Write nothing under `/usr`.**
- **The anti-goals are hard failures:** no rounded corner (a round widget such as a
  radio button is not one), no hairline
  border or divider, no cool grey. Check for them in every plan.
- **Work in small plans.** Each step of the roadmap is split into plans with
  one testable result each. Write a plan just before its work, and do not
  start the next plan until the current one's "done when" is checked.
- **Stop and ask the owner** when a spike fails, when an anti-goal cannot be
  met, or when a choice would change what Amber is.
- **Contrast pairs must pass.** A token that carries text or marks state gets
  its contrast pairs in the same change.

## Tools

Command-line tools for colour and contrast live in `tools/`; tools for
tokens and for generating the parts will join them. **Load the `ai-tools`
skill before writing any one-off script**, and use it to add a tool when none
fits. Run the tools' tests with `npm --prefix tools test`.
