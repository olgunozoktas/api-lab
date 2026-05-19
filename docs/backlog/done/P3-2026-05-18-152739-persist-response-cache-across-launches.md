# Persist the per-request response cache across launches

Priority: P3

## Context

Follow-up to `docs/backlog/done/P3-2026-05-18-145213-persist-last-response-per-request.md`
(shipped 2026-05-18). That slice added per-saved-request response
memory, but session-only — `responseCache` is deliberately kept out
of the store's `partialize`, so it resets on every relaunch. Its own
Tradeoffs section flagged cross-launch persistence as "a later
decision": response bodies can be ~1 MB each (the native bridge cap),
so persisting 30 of them risks the IndexedDB budget.

This item makes the cache survive a relaunch — re-opening API Lab and
finding your saved requests' last responses still there — without
blowing the storage budget.

## Items

- [x] **Byte-budget the cache.** `store/responseCache.ts` currently
      bounds by entry count (30). Add a total-bytes cap; evict by
      recency until under budget. Large single responses must not be
      cached at all past a per-entry ceiling. *(`putBoundedBytes` —
      256 KB per-entry ceiling, 2 MB total budget, oldest-evicted.)*
- [x] **Persist `responseCache`** — add it to the store's `partialize`
      (`store/index.ts`) so it rides the existing `idbStorage`
      adapter. Bump the persist `version` + add a migration if the
      shape needs it. *(version 3 → 4 + `migrateV3toV4`.)*
- [x] **Stale-eviction on hydrate** — optionally drop cached responses
      older than N days on load, so the cache doesn't resurrect
      long-dead responses. *(`pruneStale`, 14-day TTL, run from the
      persist `merge`. The cache value became `{ response, cachedAt }`
      to carry the timestamp TTL needs.)*

## Acceptance

After relaunching API Lab, re-selecting a saved request shows the
response it last had before the relaunch. The persisted cache stays
within a fixed byte budget and never breaks the IndexedDB persist.

## Tradeoffs

Persisting response bodies is the storage-budget risk the parent
slice avoided. A byte budget + per-entry ceiling is mandatory before
persisting. Stale eviction is a judgement call — a response from two
weeks ago may be misleading; decide a sensible TTL.

## How to work on this

`store/responseCache.ts` holds `putBounded` + `RESPONSE_CACHE_CAP` —
extend it with a byte-aware variant. `store/index.ts` `partialize` is
the persist allow-list; `store/internal.ts` has the migration chain.
Run `cd frontend && dnpm run test` and `dnpm run typecheck`.
