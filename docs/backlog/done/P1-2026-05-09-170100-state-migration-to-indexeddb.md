# Phase H.0 — Migrate persisted state from localStorage to IndexedDB

Priority: P1

## Context

The Zustand store currently persists to `localStorage` via
`createJSONStorage(safeLocalStorage)`. localStorage caps at ~5 MB
in WebKit. Phase H (pre/post scripts) and Phase I (Postman/OpenAPI
imports) will write multi-megabyte strings: a typical Postman v2.1
collection export is 1-3 MB; a Stripe-sized OpenAPI spec is 4 MB+.
Hitting the cap silently throws on `setItem`, which Zustand's
persist middleware swallows — collections vanish on reload.

Decision (`docs/plans/piped-dazzling-pretzel.md` § Engineering lens):
move to IndexedDB before any of those phases ship. Single-key store,
identical serialization. Migration is one-shot on first launch after
the change.

## Items

- [x] New `frontend/src/store/idbStorage.ts` — IndexedDB-backed `StateStorage` adapter (Promise-shaped getItem/setItem/removeItem)
- [x] Open db `apilab` v1 with one object store `kv`; persist key remains `apilab.store.v1`
- [x] Replace `createJSONStorage(safeLocalStorage)` with `createJSONStorage(() => idbStorage)` in `frontend/src/store/index.ts`
- [x] One-shot migration on first IDB read: if IDB empty AND localStorage has legacy entry, copy across + remove legacy
- [x] `safeLocalStorage` retained in `internal.ts` as a generic in-memory fallback (no longer wired but available)
- [x] 7 vitest tests via `fake-indexeddb` (round-trip, missing key, removeItem, 1MB string, migration, IDB-wins-when-pre-seeded, null-origin survival)
- [x] build.sh `--reset-state` already wipes `~/Library/WebKit/API Lab/` which holds both LocalStorage AND IndexedDB — comment updated

## Acceptance

Existing users upgrade transparently — collections, history, env,
defaults, tabs all preserved across the localStorage → IDB hop.
Writing a 5 MB collection succeeds. Reload works. Hard reset
(`./build.sh --reset-state`) clears IDB too (extend script to wipe
the IDB origin folder).

## Tradeoffs

IndexedDB is async; Zustand's persist middleware handles that, but
initial render runs before hydration completes — components must
gracefully render with default state. Today's code already assumes
this (buildInitialState seeds non-empty arrays).

## How to work on this

1. Read `frontend/src/store/internal.ts:safeLocalStorage` for the
   storage adapter contract.
2. Use the `idb` library (~10 KB, well-trodden) or hand-roll with
   the native IndexedDB API (~30 LOC, no dep). Recommend `idb`.
3. Update `build.sh --reset-state` step to also wipe the WebKit
   IndexedDB folder (`~/Library/WebKit/API Lab/WebsiteData/IndexedDB/`).
4. Ship behind no flag — migration is silent.

## Status

**Shipped 2026-05-09** in worktree `feat/idb-migration` (merge `2a3f137`). Used the `idb` package (~5 KB) via `dnpm install`. Added `fake-indexeddb` to dev deps for tests.

The legacy `safeLocalStorage` helper stays in `internal.ts` even though no code currently imports it — keeps the in-memory fallback available for any future consumer that needs synchronous storage.

Total tests: 109 → 116. Bundle: 1067 KB JS / 328 KB gz (+5 / +1.5 KB for the `idb` package).
