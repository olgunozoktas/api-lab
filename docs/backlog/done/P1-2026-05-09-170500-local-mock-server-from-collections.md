# Phase L.1 — Local mock server from collection examples

Priority: P1
Status: SHIPPED (frontend half) — 2026-05-09

## Status

Frontend half landed 2026-05-09:

- `Example` type on `RequestSnapshot.examples?: Example[]` —
  captures status, headers, body, content-type, **path + method**
  (extracted from URL via `lib/examples.ts:pathFromUrl`, which
  tolerates Mustache `{{base_url}}` prefixes)
- "Save as example" button in `ResponseHead` next to Copy / Copy-as.
  Uses `suggestExampleName` for a sensible default
  ("GET /users/42 → 200")
- New "Examples" tab in `ResponseViewer` with count badge. Tab is
  reachable even before a fresh response so users can revisit saved
  examples directly
- `ExamplesPanel` — list view with status pill, method, name
  (click to view in response area, double-click to rename), size,
  rename button, view button, delete button (with confirm dialog)
- Store: `addExample`, `renameExample`, `deleteExample` actions —
  mirror writes into `current` AND the persisted CollectionItem so
  examples round-trip
- Examples auto-survive Postman v2.1 imports (the importer already
  walks request snapshots; new examples field is just extra data
  that round-trips)
- 17 unit tests on `lib/examples.ts` (path extraction edge cases,
  example construction + round-trip, name suggestion)

The Zig HTTP-server sidecar that consumes these examples + serves
them on `127.0.0.1:<port>` is filed as a separate P1 follow-up:

- `P1-2026-05-09-180400-mock-server-zig-sidecar.md`

Split-out reason: Zig 0.16's `std.Io.net` surface only exercises
client-side patterns in zero-native's codebase. The blocking
TCP-listener API needs upstream Zig std-lib investigation that
wasn't safe to fit in the same session as the frontend half.

## Context

"I'm gonna mock that in API Lab" should be possible. Postman cloud
mocks lock you into their account; Insomnia mocks need their plan.
We can ship a local-only mock server in Zig (binary already has
HTTP capabilities via curl; flipping the listener side is a
straightforward addition).

Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Phase L.1.

## Items

- [ ] New `src/handlers/mock.zig` — minimal HTTP server, listens on `127.0.0.1:<port>`, responds from collection example payloads
- [ ] New bridge commands: `mock.start({collectionId, port?})`, `mock.stop({id})`, `mock.list() -> [{id, port, collectionId, status}]`
- [ ] Per-request example storage in `CollectionItem.request.examples?: Example[]` — `{name, status, headers, body, matchOn?: {path, method, queryHas?}}`
- [ ] Mock UI: a panel under the request showing examples + "Add from current response" button
- [ ] Mock control panel: list active mocks, port + URL, stop button, last-N requests log
- [ ] Security: bind 127.0.0.1 only; ephemeral port by default; optional `Bearer <auto-token>` requirement (token shown in panel)

## Acceptance

User saves a real response as an example → starts a mock from the
collection → `curl http://127.0.0.1:NNNN/api/users` returns the
mocked payload. Stopping the mock kills the process cleanly.

## Tradeoffs

Sidecar Zig process (not always-on); user has to pin via launchd
later for "monitor when app closed" use cases (Phase L.3).

## How to work on this

1. Read `src/handlers/http.zig` for the existing HTTP-as-client
   handler pattern.
2. Zig 0.16 has `std.http.Server` — recent API but functional.
3. Wire start/stop into the lifecycle so `app_quit` kills active
   mocks (no orphan processes).
