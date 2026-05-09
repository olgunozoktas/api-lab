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

- [ ] New `frontend/src/store/idbStorage.ts` — IndexedDB-backed `StateStorage` adapter that matches Zustand's expected interface (getItem / setItem / removeItem returning Promises)
- [ ] Open db `apilab` v1 with one object store `kv`; key `apilab.store.v1`
- [ ] Replace `createJSONStorage(safeLocalStorage)` with `createJSONStorage(idbStorage)` in `frontend/src/store/index.ts`
- [ ] One-shot migration: on store hydration, if IDB is empty AND localStorage has the legacy key, copy the JSON across and remove the legacy key
- [ ] Keep `safeLocalStorage` as an in-memory fallback for null-origin contexts (assets-mode quirk we already handle)
- [ ] Tests: `idbStorage` round-trip + migration test using `fake-indexeddb`

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
