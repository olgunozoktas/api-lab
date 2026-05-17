# Docs preview — click an operation to jump the editor

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-171700-spec-to-docs-redoc-preview.md`
(shipped 2026-05-18 as v0.11.0). The Redoc docs preview updates live
as the spec is edited (editor → docs). The reverse — the K.3
acceptance's "click an operation in the preview sidebar → matching
CodeMirror line scrolls into view" — was NOT shipped:
`RedocStandalone` is a sealed third-party component with no hook for
"operation clicked → spec path/line".

CEO + Eng lens (both agree): bidirectional sync is the difference
between "a docs preview" and "a docs-driven editor". CEO wants the
navigation; Eng notes it needs either intercepting Redoc's location
hash (`#operation/...` → resolve to a spec path → map to an editor
line) or swapping `RedocStandalone` for a lower-level Redoc API that
exposes selection events.

## Items

- [ ] On a hash/route change inside the Redoc pane, resolve the
      operation to its JSON path in the spec.
- [ ] Map the JSON path to a line in the CodeMirror document and
      scroll the editor caret there.
- [ ] Keep it best-effort — silently no-op when the mapping can't be
      resolved (a sealed component may not always surface enough).

## Acceptance

Clicking an operation in the docs preview moves the editor caret to
that operation's line in the spec.

## Tradeoffs

- `RedocStandalone` is sealed. Option A: observe `location.hash` while
  the pane is mounted. Option B: drop to Redoc's lower-level
  `AppStore` / store API. Option A is lighter; start there.
- Mapping a JSON path → source line needs a position-aware YAML/JSON
  parse (the structural importer currently discards positions).

## How to work on this

1. Spike Option A — does Redoc update `location.hash` on sidebar
   clicks within an embedded `RedocStandalone`?
2. A position-aware parse (line numbers per JSON path) is the reusable
   primitive — Spectral's findings already carry line/col; see if
   that path is reusable.
