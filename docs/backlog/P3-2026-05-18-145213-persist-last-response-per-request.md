# Persist & restore the last response per saved request

GitHub Issue: [#41](https://github.com/olgunozoktas/api-lab/issues/41)

Priority: P3

## Context

Follow-up to `docs/backlog/P1-2026-05-18-145002-response-panel-reset-on-request-load.md`.
That P1 makes selecting a saved request clear the response panel —
correct, because a saved `CollectionItem` stores only the request,
never a response. But the Postman-parity behavior users expect is
richer: re-opening a request you sent earlier in the session should
show **its** last response again, not an empty panel.

Today `lastResponse` is per-open-tab, not per-saved-request — so
loading request A, sending it, loading request B, then loading A
again loses A's response. This item adds per-request response memory.

## Items

- [ ] **Store the last response against the saved request id** — when
      a send completes for a request with a `CollectionItem` id, keep
      its response (keyed by that id) in a bounded in-memory map (or
      persisted slice with a size budget).
  - Touchpoints: a new store slice (`store/responseCache.ts` or
    similar); the send-completion path (`lib/sendRequest.ts` /
    wherever `lastResponse` is set); `loadCollection` reads the cache.
  - Tests: cache set/get, eviction at the size budget, miss → null.
- [ ] **Restore on load** — `loadCollection` (and the new-tab twin)
      hydrate `lastResponse` from the cache when an entry exists for
      that request id; otherwise clear it (the P1 behavior).
- [ ] **Budget + eviction** — cap the cache (count and/or bytes);
      large bodies must not blow the persisted-state budget. Decide
      session-only vs persisted (the native bridge result buffer and
      IDB budget are the constraints — see `lib/changelog`-adjacent
      budgeting and `src/handlers/http.zig`'s ~1 MB cap).

## Acceptance

Sending request A, switching to B, then re-selecting A shows A's last
response again. The cache is bounded — it never grows unboundedly or
breaks the persisted-state budget. A request with no cached response
still shows the empty panel.

## Tradeoffs

Response bodies can be large; persisting them across launches risks
the IDB budget — session-only memory is the safer first cut, with
persistence as a later decision. This changes the mental model from
"the panel reflects the active tab" to "the panel reflects the
selected request" — make sure the History tab and unsaved requests
still behave sensibly. Depends on the P1 fix landing first (it
defines the no-cache-entry fallback).

## How to work on this

Land the P1 first (defines the clear-on-miss behavior), ideally the
P2 helper too (so restore-vs-clear lives in one place). Then add the
response cache slice and wire send-completion + `loadCollection`.
Start session-only (simplest, no budget risk), measure, then decide
on persistence. Run `cd frontend && dnpm run test` and
`dnpm run typecheck`. Ship via
`/backlog-ship docs/backlog/P3-2026-05-18-145213-persist-last-response-per-request.md`.
