# Split `store/index.ts` per slice — 643 LOC over the 400 cap

Priority: P2

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-202732-grpc-reflection-cache-per-target-5min-ttl.md`
(shipped 2026-05-09). Building the reflection cache surfaced the
elephant: `frontend/src/store/index.ts` is at **643 LOC** — well over
the project's 400-LOC hard cap. The cache slice intentionally lived
in a standalone store next to it (not as a slice mounted on
`useStore`) precisely to avoid pushing `index.ts` further over the
cliff.

CLAUDE.md says: "Legacy files at the time of this rule landing must
be refactored before extension." This slice didn't extend
`index.ts` — but the next time anyone touches it, the rule kicks in.
Better to do the refactor as its own focused change than to bundle
it into an unrelated slice.

The store is also persisted (Zustand `persist` middleware backed by
IDB, with v1→v2→v3 migrations), so the split needs to keep the
wire-format and migration chain intact. This isn't a copy-paste —
slices need careful per-domain extraction with the persist key
boundary preserved.

## Items

- [ ] Audit `store/index.ts` → identify natural slice boundaries.
      Provisional grouping: collections (collectionItems +
      collectionsExpanded + addFolder/move/etc.), tabs (tabs +
      activeTabId + newTab/closeTab/etc.), env (envs + activeEnv +
      setEnvs + setActiveEnv), history (history + pushHistory +
      clearHistory), examples (addExample/renameExample/etc.), ui
      (ui + setUi + locale + setLocale + defaults + setDefaults),
      response (lastResponse + setLastResponse + toast + showToast),
      current (current + setCurrent + resetCurrent +
      loadCollection / loadHistoryItem + saveCurrent).
- [ ] Split each slice into its own file under `frontend/src/store/`
      (one file per concern). Extract action types + initializers
      where they live now in `internal.ts`.
- [ ] `index.ts` becomes the composition root: imports each slice,
      composes via Zustand's slice pattern (`(set, get) =>
      ({...createCollectionsSlice(set, get), ...createTabsSlice(...),
      ...})`), keeps the persist middleware + migration chain
      intact.
- [ ] Verify v1→v2→v3 migrations still fire correctly (write a
      test if one doesn't exist — load a v2 persisted snapshot,
      verify v3 shape after).
- [ ] Each new slice file MUST stay under 400 LOC. If a slice
      naturally hits 350+, decompose further (e.g. collections +
      collectionTree + collectionImport).
- [ ] All existing tests pass without modification — the public
      `useStore` hook surface is unchanged; only the internals
      reorganize.
- [ ] `index.ts` final size after split should be a slim
      composition layer (target: under 100 LOC).

## Acceptance

`wc -l frontend/src/store/*.ts` shows zero files over 400. All 19
existing test files in `store/__tests__/` and `lib/__tests__/` pass
without modification. The persisted snapshot from before the split
loads cleanly post-split (run `./build.sh --release` and verify
collections/env/history are intact). Adding a new slice (the next
backlog item touching the store) is a one-file addition — no need
to grep through 600+ lines.

## Tradeoffs

The slice pattern adds some indirection — debugging a state mutation
requires opening the right slice file. Mitigated by clear file names
matching domain concepts (`store/collections.ts`,
`store/tabs.ts`, etc.) — same convention the project's own
component layer uses.

Migration risk: if the persist middleware sees a different shape
than v3 expects, users could lose their persisted state. Mitigation:
the slices compose into the SAME State type that v3 produces; the
persist middleware doesn't see the slice boundaries at all. Plus the
existing `migrate` callback chain is preserved untouched.

The split could be a candidate for breaking apart `internal.ts` (244
LOC) too — its `clone`, `descendantIds`, etc. could move next to the
slices that use them. Held for a separate item if needed.

## How to work on this

1. `wc -l frontend/src/store/*.ts` to confirm the starting line
   counts. Read `index.ts` and `internal.ts` end-to-end.
2. Sketch the slice boundaries on paper first — make sure no slice
   needs to read another's state outside the composition root.
   Most cross-slice reads can use Zustand's `get()` from inside
   the action body.
3. Extract slices one at a time, running `dnpm isolated npx tsc
   --noEmit` after each. The persist `partialize` block in
   `index.ts` is the riskiest part — it lists every state key by
   name, and the slice extraction must keep that union complete.
4. Run the existing test suite after each extraction (267 tests).
   Any failure means a state key got dropped or moved incorrectly.
5. Final pass: `wc -l` to confirm every file is under 400.
