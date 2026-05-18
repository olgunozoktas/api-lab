# Reset the response panel when a saved request is selected

GitHub Issue: [#39](https://github.com/olgunozoktas/api-lab/issues/39)

Priority: P1

## Context

Selecting a saved request in the Collections sidebar (or a History
entry) swaps the active tab's request but leaves the response panel
stale. `loadCollection` and `loadHistoryItem` in
`frontend/src/store/current.ts` rebuild `current` + the active tab's
`request`, but they never touch `lastResponse` or `ui.responseTab`.
So:

- The right panel keeps showing the **previous** request's response
  body — e.g. clicking "List accounts" can still display "List
  zones"'s JSON.
- The response panel stays on whatever tab was open (Visualize,
  Headers, Raw, …) instead of returning to Body.

This is a divergence bug: `loadSample` already clears `lastResponse`
(but not `responseTab`), and the new-tab loaders
`loadCollectionInNewTab` / `loadHistoryItemInNewTab`
(`frontend/src/store/tabs.ts` ~L165) do **both** correctly. Only the
in-place loaders drifted. The user reported it directly: "when a
request is selected on the left, the right panel should auto-update,
and the right panel should always open the default Body tab."

## Items

- [x] **Clear the stale response on request load** — `loadCollection`
      and `loadHistoryItem` set `lastResponse: null` on both the
      top-level mirror and the active tab record, mirroring what
      `loadSample` and `loadCollectionInNewTab` already do. A
      freshly-selected saved request has no response, so the panel
      shows the empty state until the user sends.
  - Touchpoints: `frontend/src/store/current.ts` — `loadCollection`
    (~L90), `loadHistoryItem` (~L117). Update both the returned
    top-level `lastResponse` and the `tabs.map` active-tab record.
  - Tests: `frontend/src/store/__tests__/current.test.ts` (create if
    absent) — after `loadCollection`, top-level `lastResponse` is null
    AND the active tab record's `lastResponse` is null; same for
    `loadHistoryItem`.
- [x] **Default the response panel to Body on request load** — all
      three in-place loaders (`loadCollection`, `loadHistoryItem`,
      `loadSample`) reset `ui.responseTab` to `"body"` on both the
      `ui` object and the active tab record, so switching requests
      never leaves the panel stuck on Visualize / Headers / Raw /
      Examples / Tests / Console.
  - Touchpoints: same file; the `ui: { ...s.ui, ... }` and `tabs.map`
    blocks in each of the three loaders.
  - Tests: after each loader, `ui.responseTab === "body"` and the
    active tab record's `responseTab === "body"`.

## Acceptance

- Selecting a saved request in the Collections sidebar replaces the
  response panel — no response body from the previously-open request
  stays visible.
- After selecting any saved request, History entry, or Sample, the
  response panel's active tab is **Body**.
- A request that was never sent shows the empty response state, not
  stale data from another request.

## Tradeoffs

`loadHistoryItem` conceptually loads a past send that *had* a
response — but it currently only restores the request, never the
response, so showing a stale unrelated response is strictly wrong;
clearing it is correct. Restoring a History entry's own response is a
separate, larger idea — out of scope here. Both the top-level
`lastResponse` / `ui` mirrors AND the active tab record must be
updated together, or a later tab switch resurrects the stale value
from the record — `loadSample` is the reference pattern.

## How to work on this

Start in `frontend/src/store/current.ts`. `loadCollectionInNewTab`
(`frontend/src/store/tabs.ts` ~L165) is the reference — it already
sets `lastResponse: null` and `responseTab: "body"`; the in-place
`loadCollection` / `loadHistoryItem` / `loadSample` just need to
match it. Each loader returns a patch with a `current` mirror, a `ui`
object, and a `tabs.map` updating the active-tab record — add
`lastResponse` / `responseTab` to all three places. Add
`frontend/src/store/__tests__/current.test.ts` covering the three
loaders (the store-test harness pattern is in
`store/__tests__/collectionItems.test.ts` —
`useStore.getState().loadCollection(...)` then assert state). Run
`cd frontend && dnpm run test` and `dnpm run typecheck`. Ship via
`/backlog-ship docs/backlog/P1-2026-05-18-145002-response-panel-reset-on-request-load.md`.
