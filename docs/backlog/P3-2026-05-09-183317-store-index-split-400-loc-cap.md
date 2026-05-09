# Split `frontend/src/store/index.ts` to honor the 400-LOC cap

Priority: P3

## Context

CLAUDE.md (project-wide hard rule): every React component, every Zig
file, and every standalone TypeScript module under `frontend/src/`
must stay ≤ 400 lines. `frontend/src/store/index.ts` is currently 643
lines — pre-existing debt that's been called out twice now (the
gRPC reuse-auditor flagged it on 2026-05-09 morning, and the
ErrorBoundary split on the same day rediscovered it as the only
remaining violator).

The store holds Zustand action implementations: collection-tree
mutators, env CRUD, history push/clear, tabs management, plus the
zustand `persist` config. Several action methods are 30-80 LOC each
because they walk the tree + reconcile tabs/current/lastResponse
mirrors.

This isn't a new-functionality slice; it's a code-organization
refactor with zero user-visible change.

## Items

- [ ] Split actions per slice into separate files. Suggested layout:
  - `store/index.ts` — top-level `create`/`persist` setup, type
    glue, exports. Should drop to ~120 LOC.
  - `store/actions/collections.ts` — addFolder, importItems,
    deleteCollectionItem, renameCollectionItem, moveCollectionItem,
    saveCurrent, loadCollection, loadCollectionInNewTab,
    descendantIds-using actions.
  - `store/actions/env.ts` — setEnvs, setActiveEnv, env mutator
    helpers.
  - `store/actions/history.ts` — pushHistory, clearHistory,
    loadHistoryItem.
  - `store/actions/tabs.ts` — newTab, closeTab, setActiveTab,
    snapshotActiveIntoTab callers.
  - `store/actions/ui.ts` — setUi, toggleFolder, setLayout helpers.
  - `store/actions/examples.ts` — saveExample, renameExample,
    deleteExample.
- [ ] Each action file exports a builder function:
      `(set, get) => ({ ...actionMethods })`. The root index merges
      all builders into one create() call.
- [ ] Move the Zustand `persist` config + version migrations into
      `store/persist.ts`.
- [ ] Keep `store/internal.ts` as-is (already split — buildInitialState,
      migrations, snapshotActiveIntoTab live there).
- [ ] Verify all files end up under 400 LOC.
- [ ] No behavioral changes — same store API surface, same persist
      shape. Run the full vitest + typecheck suite to confirm.

## Acceptance

`wc -l frontend/src/store/index.ts` reports < 200 lines after the
split. No file in `frontend/src/store/` exceeds 400 lines. All 235+
existing frontend tests pass without modification. `dnpm run typecheck`
clean.

## Tradeoffs

The current monolithic file is easy to ctrl-F across — splitting adds
import navigation overhead. Mitigation: the per-slice files mirror
the CoreState shape, so finding "where is foo action defined" is
predictable from the slice name (`store/actions/foo.ts`).

The action-builder pattern (`(set, get) => ({...})`) does add a small
amount of boilerplate per file but matches Zustand's "slice" pattern
documented in their docs. Future slices remain trivially addable.

If a single action grows past 400 lines on its own (currently the
biggest is `importItems` at ~50 LOC, well under), it'd need
secondary helpers — same standard refactor.

## How to work on this

1. Read `frontend/src/store/index.ts` end-to-end — know what's in
   each method before moving anything.
2. Move one slice at a time + run tests after each move. Don't
   batch — small commits per slice make review tractable.
3. The Zustand `persist` middleware wraps the WHOLE store; keep its
   single create() call after merging all slice builders.
4. Reference: Zustand "slices pattern" docs at
   docs.pmnd.rs/zustand/guides/slices-pattern.
5. `internal.ts` already does the heavy lifting for state shape;
   this slice is purely about action body location.
