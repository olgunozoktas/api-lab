# Plan: split `store/index.ts` per slice

For: `docs/backlog/P2-2026-05-09-211312-split-store-index-per-slice-643-loc-cap-violation.md`
Generated: 2026-05-10 (UTC)
Mode: inline (no gstack signal in this project)

## Architecture

Zustand's slice-composition pattern. `store/index.ts` becomes a thin
composition root that spreads `buildInitialState()` plus every
`createXSlice(...args)`. Each slice file exports:

1. A typed action contract (`CollectionsActions`, etc.).
2. A `StateCreator<Store, [["zustand/persist", unknown]], [], XActions>`.

A new `store/types.ts` builds `Store = CoreState & Actions` where
`Actions` is the intersection of every slice's action type. Type-only
circular imports are fine: TS resolves the graph statically.

## Slice mapping (verbatim from item 1)

| Slice         | File                  | Actions                                                                                              |
| ------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| collections   | `store/collections.ts`| addFolder, deleteCollectionItem, renameCollectionItem, toggleFolder, moveCollectionItem, importItems |
| tabs          | `store/tabs.ts`       | newTab, closeTab, setActiveTab, renameTab, reorderTabs, loadCollectionInNewTab                        |
| env           | `store/env.ts`        | setEnvs, setActiveEnv                                                                                 |
| history       | `store/history.ts`    | pushHistory, clearHistory                                                                             |
| examples      | `store/examples.ts`   | addExample, renameExample, deleteExample                                                              |
| ui            | `store/ui.ts`         | setUi, setLocale, setDefaults                                                                         |
| response      | `store/response.ts`   | setLastResponse, showToast                                                                            |
| current       | `store/current.ts`    | setCurrent, resetCurrent, loadCollection, loadHistoryItem, saveCurrent                                |

`store/internal.ts` is unchanged: holds `CoreState`, `buildInitialState`,
`clone`, `descendantIds`, `nextOrder`, `snapshotActiveIntoTab`,
`nextActiveAfterClose`, `migrateV1toV2`, `migrateV2toV3`. Each slice
imports the helpers it needs.

## Persist preservation

Persist config is moved verbatim — same `name: "apilab.store.v1"`,
`version: 3`, `migrate` chain, `storage: createJSONStorage(() => idbStorage)`,
`partialize` listing the exact 10 keys. Persisted snapshots from before
the split load identically: `partialize` sees the merged `Store`, slice
boundaries are invisible to the middleware.

## Cross-slice action calls — preserved

- `saveCurrent` (current) calls `get().showToast()` (response). Fine: `get()`
  returns the merged `Store`.
- `setUi` (ui) mutates `s.tabs` (tabs) when composerTab/responseTab changes.
  Fine: `set()` shallow-merges into the merged state.
- `setCurrent`/`resetCurrent`/`loadCollection`/`loadHistoryItem` (current)
  mutate `s.tabs` + `s.ui`. Fine.
- `deleteCollectionItem`/`renameCollectionItem` (collections) mutate
  `s.tabs` + `s.current`. Fine.
- `importItems` (collections) mutates `s.envs` + `s.activeEnv`. Fine.

## Edges + risks

- **partialize key drift** — if any of the 10 persisted keys gets dropped
  from the merged shape, persist starts losing user data. Mitigation:
  the keys are properties of `CoreState`, untouched by this refactor;
  `partialize` lists them by name, so a missing key surfaces as TS error.
- **StateCreator middleware mutator typing** — `[["zustand/persist", unknown]]`
  vs `[]`. Slices use the persist mutator form so `set` typing matches the
  root creator under persist. Mismatch surfaces as compile error.
- **Test compatibility** — tests import `useStore` from `../index` (or
  `from "../store"`); the export contract is unchanged.

## Tests

- All 272 existing tests must pass without modification (acceptance).
- NEW: `store/__tests__/migration.test.ts` — covers v0/v1→v2 and v2→v3
  migrations end-to-end. Item 4 calls this out explicitly.

## Rollback

Pure git revert. The worktree is isolated; `main` is untouched until
review-gate approval.
