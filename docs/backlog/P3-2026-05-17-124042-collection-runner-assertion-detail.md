# Collection runner — failed-assertion drill-down + re-run failed

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-171200-collection-runner-iteration-data.md`
(shipped 2026-05-17 as v0.9.0). The runner shows an assert tally
(`3/5`) per cell and pass/fail/error status, but you can't see *which*
assertion failed without leaving the modal, and a run is all-or-nothing
— no way to re-run just the red cells.

CEO + Eng lens (both agree): the failing-assertion names are already
collected on every `RunResultRow.asserts` — the data exists, it's just
not surfaced. A click-to-expand on a failed cell + a "re-run failed"
button turns the runner from "it failed" into "here's exactly what and
fix-and-retry", the core debugging loop.

## Items

- [ ] Click a `fail` / `error` cell in `CollectionRunProgress` to
      expand the failing assertion names + messages inline.
- [ ] "Re-run failed" button after a run — builds a `RunPlan` from
      only the failed/errored cells' (request, iteration) pairs.
- [ ] Keep the prior run's passed cells visible/greyed so the re-run
      reads as a continuation, not a fresh run.

## Acceptance

After a run with failures, the user expands a red cell to read the
assertion that failed, fixes the request/script, and clicks "Re-run
failed" to retry only those cells.

## Tradeoffs

- Re-run-failed needs the engine to accept an explicit (request,
  iteration-row) work list rather than the full cross-product —
  a small `runCollection` signature addition or a `RunPlan` variant.

## How to work on this

1. `RunResultRow.asserts` already carries the detail — render it.
2. Extend the engine to accept a pre-built work list for the
   re-run path.
