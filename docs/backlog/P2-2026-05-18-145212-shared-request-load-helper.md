# Extract a shared request-load helper so the loaders can't drift

GitHub Issue: [#40](https://github.com/olgunozoktas/api-lab/issues/40)

Priority: P2

## Context

Follow-up to `docs/backlog/P1-2026-05-18-145002-response-panel-reset-on-request-load.md`.
That P1 fixes a stale-response-panel bug whose root cause is
structural: API Lab has **five** request loaders that each hand-build
the loaded-tab state —

- `loadCollection`, `loadHistoryItem`, `loadSample`
  (`frontend/src/store/current.ts`, in-place: load into the active tab)
- `loadCollectionInNewTab`, `loadHistoryItemInNewTab`
  (`frontend/src/store/tabs.ts`, open in a fresh tab)

Each one independently assembles the `current` mirror, the `ui`
fields (`composerTab`, `responseTab`), `lastResponse`, and the
`tabs.map` active-tab record. They have already drifted: the new-tab
loaders reset `lastResponse` + `responseTab`, the in-place ones did
not — which is exactly the P1 bug. Fixing the P1 makes the five agree
*today*, but nothing stops the next edit from diverging again.

## Items

- [ ] **Extract `buildLoadedRequestState(request)`** — a pure helper
      (in `frontend/src/store/` or `frontend/src/lib/`) that takes a
      request-shaped input and returns the canonical loaded state
      slice: `current` mirror, `composerTab`, `responseTab: "body"`,
      `lastResponse: null`. Single source of truth for "what loading
      a request into a tab means".
  - Touchpoints: new helper module; `store/current.ts` (3 loaders),
    `store/tabs.ts` (2 loaders) all consume it.
  - Tests: `frontend/src/store/__tests__/` — the helper's output for
    HTTP vs GraphQL requests; each of the 5 loaders produces a
    consistent response-panel state.
- [ ] **Regression guard** — a test that asserts the in-place and
      new-tab loader pairs produce the same response-panel state for
      the same input, so a future drift fails CI.

## Acceptance

There is one helper that defines loaded-tab state; all five loaders
call it; no loader hand-rolls `lastResponse` / `responseTab` /
`composerTab` independently. A drift between in-place and new-tab
loaders is caught by a test.

## Tradeoffs

The loaders differ in more than the request payload — new-tab loaders
also mint a tab id, set `activeTabId`, and append to `tabs`; in-place
loaders rewrite the active record. The helper should cover only the
**shared** request→state mapping, not tab-list management — keep its
surface narrow or it becomes a second tangle. Land after (or with)
the P1 fix so the helper encodes the already-correct behavior.

## How to work on this

Do the P1 fix first (or together) so the five loaders are correct,
then extract the common shape into the helper and route all five
through it. Loaders are in `frontend/src/store/current.ts` and
`frontend/src/store/tabs.ts`. Store-test harness pattern:
`frontend/src/store/__tests__/collectionItems.test.ts`. Run
`cd frontend && dnpm run test` and `dnpm run typecheck`. Ship via
`/backlog-ship docs/backlog/P2-2026-05-18-145212-shared-request-load-helper.md`.
