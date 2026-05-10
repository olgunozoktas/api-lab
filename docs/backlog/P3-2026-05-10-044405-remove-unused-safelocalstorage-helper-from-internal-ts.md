# Remove unused `safeLocalStorage` helper from `store/internal.ts`

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-211312-split-store-index-per-slice-643-loc-cap-violation.md`
(shipped 2026-05-10). The store split surfaced that `safeLocalStorage()`
in `frontend/src/store/internal.ts:221-244` is only defined, never
imported anywhere in `frontend/src/`. Verified via:

```
grep -rE "safeLocalStorage" frontend/src
# only hits internal.ts itself
```

Background: this helper was the persistence adapter before the project
migrated to IDB-backed storage (`store/idbStorage.ts`). The migration
landed; the helper survived as dead code. Removing it drops 24 LOC
from `internal.ts` (244 → 220) and removes a confusing alternate path
that future readers would waste time evaluating.

## Items

- [ ] Delete `safeLocalStorage()` from `frontend/src/store/internal.ts`.
- [ ] Verify nothing imports it: `grep -rE "safeLocalStorage" frontend/src`
      after the delete should return zero results.
- [ ] Run `dnpm isolated npx tsc --noEmit` and the test suite to
      confirm no test or component depends on it.
- [ ] Drop a one-line entry in the session doc — no changelog/
      entry needed (internal cleanup, not user-visible).

## Acceptance

`internal.ts` line count drops by ~24. Typecheck clean. All 277+
tests pass. No grep hits for `safeLocalStorage` in `frontend/`.

## Tradeoffs

None worth surfacing. Pure dead-code removal. The test stub it
provided (in-memory fallback for null-origin) is no longer relevant
because IDB doesn't have the assets-mode origin restriction
`localStorage` has — and the test environment uses jsdom which mocks
neither, with errors swallowed in `idbStorage.ts`.

## How to work on this

15-minute task. Single-edit + verify. Easy candidate for a slice in a
broader internal.ts cleanup if anything else accumulates there.
