# Decompose store/tabs.ts — it is over the 400-line cap

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-171600-spectral-linting-rulesets.md`
(shipped 2026-05-17). `frontend/src/store/tabs.ts` was already **407
lines on `main`** — over the CLAUDE.md 400-line hard cap — before this
ship. Adding the `updateSpecRuleset` action (a genuine, minimal tab
mutation that belongs in the tabs slice) took it to **415**.

Eng lens (surfaced honestly rather than left silent): the file is a
pre-existing cap violation. The rule says legacy over-cap files must
be refactored before extension; this ship made a minimal +8-line
extension and is filing the decomposition rather than ballooning the
ship's diff with a store refactor.

The tabs slice has a natural seam: the bulk-close family
(`closeTab` / `closeOtherTabs` / `closeTabsToRight` / `reopenLastClosedTab`,
plus the `pushClosed` helper) is ~140 lines and largely independent
of the open/activate/rename/reorder/spec actions.

## Items

- [ ] Extract the close/reopen actions into `store/tabsClose.ts` (or
      lift their bodies into `store/internal.ts` helpers the slice
      composes), so `store/tabs.ts` lands comfortably under 400.
- [ ] Keep `createTabsSlice` as the single exported slice creator —
      the split is internal; `store/index.ts` composition is unchanged.
- [ ] No behaviour change — pure structural refactor (no changelog
      entry, no version bump). Lean on `store/__tests__/tabs.test.ts`.

## Acceptance

`store/tabs.ts` is under 400 lines; `store/__tests__/tabs.test.ts`
stays green; tab open/close/reopen/pin/reorder behave identically.

## Tradeoffs

- Splitting a zustand slice creator across files needs care — the
  `set`/`get` closure must stay shared. Extracting action *bodies* as
  pure helpers (the `internal.ts` pattern already in use) is lower
  risk than splitting the slice creator itself.

## How to work on this

1. Mirror the existing `store/internal.ts` extraction pattern —
   `snapshotActiveIntoTab`, `nextActiveAfterClose` already live there.
