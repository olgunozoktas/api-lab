# Spec lint — click-to-navigate + quick-fix from findings

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-171600-spectral-linting-rulesets.md`
(shipped 2026-05-17 as v0.10.0). The Spectral lint panel lists every
finding and the editor gutter marks the offending lines, but a panel
row is inert — clicking it does nothing, and there's no fast path
from "this rule is noisy" to silencing it.

CEO + Eng lens (both agree): every `LintFinding` already carries
`startLine` / `startCol` / `code` / `path` — the data for both
affordances exists, only the wiring is missing. Click-to-jump turns
the panel into a navigable index; a right-click "disable this rule"
that appends to the custom ruleset closes the tune-the-linter loop
without hand-editing YAML.

## Items

- [ ] Click a lint-panel row → scroll + place the editor cursor at
      the finding's line/column.
- [ ] Right-click a lint-panel row → "Disable rule <code>" — appends
      `<code>: off` to the spec tab's custom ruleset and re-lints.
- [ ] Right-click → "Set severity…" — quick re-grade (error / warn /
      info / hint) written into the ruleset.

## Acceptance

Clicking a finding moves the editor caret to it; right-clicking and
choosing "Disable rule" makes that finding (and the gutter marker)
disappear on the next lint pass.

## Tradeoffs

- The editor's `CodeEditor` needs a way to accept an external
  "reveal line N" command — a small imperative handle or a `revealLine`
  prop.

## How to work on this

1. `LintFinding` already has the coordinates — thread an `onJump`
   callback from `SpecSidePanel` → `OpenApiEditor` → `CodeEditor`.
2. The custom-ruleset append reuses `parseCustomRuleset` +
   `updateSpecRuleset`.
