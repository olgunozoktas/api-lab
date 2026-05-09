# Phase L.1.b — Mock server Zig sidecar (HTTP listener)

Priority: P1

## Context

Phase L.1's frontend half shipped 2026-05-09: `Example` data model,
"Save as example" button, Examples tab in ResponseViewer, full
add/rename/delete + view-in-viewer surface. Examples persist with
the saved request and round-trip through Postman v2.1 imports.

The remaining half is the Zig HTTP server sidecar that consumes the
saved examples and serves them on `127.0.0.1:<port>`. It was split
out because Zig 0.16's `std.Io.net` surface only exercises
client-side patterns in zero-native's codebase — the blocking
TCP-listener API needs investigation that wasn't safe to fit into
the same session as the frontend half.

## Items

- [ ] Verify Zig 0.16 `std.Io.net` server-side surface — read upstream Zig std docs for `IpAddress.bind` / `IpAddress.listen` (or whatever the 0.16 equivalent is). Document the chosen API in `src/handlers/mock.zig`'s header comment for future reference.
- [ ] New `src/handlers/mock.zig` — minimal HTTP server:
  - `Server.start(allocator, examples, port_or_zero) -> {port, id}`
  - `Server.stop(id)` — atomic shutdown flag + close listener + join thread
  - Worker thread runs accept loop, parses request line + headers (skip body for v1), matches `(method, path)` against the example list, writes back `HTTP/1.1 <status>\r\n<headers>\r\n\r\n<body>`
  - Bind 127.0.0.1 only (security)
  - Ephemeral port if `port_or_zero == 0`
- [ ] 3 bridge handlers, all sharing context (active servers map):
  - `mock.start({collectionId, examples: Example[], port?})` → `{id, port}`
  - `mock.stop({id})` → `{ok: true}`
  - `mock.list()` → `[{id, port, exampleCount, status}]`
- [ ] App lifecycle: register a shutdown hook (or rely on context destructor) that stops all active servers on app_quit.
- [ ] Frontend `MockControlPanel` — sidebar tab or floating panel:
  - List active mocks with port + base URL
  - "Start mock" button per request that has examples
  - "Stop" + "Stop all" buttons
- [ ] Tests:
  - Zig handler test for matcher (`(method, path)` → example) — pure helper, no socket
  - Zig integration test that starts a server on ephemeral port + curls it (gated behind a test feature flag — needs network capability in test env)
  - Frontend test for the bridge command shape

## Acceptance

User runs a real request, hits "Save as example", clicks "Start
mock" → API Lab shows `http://127.0.0.1:NNNN`. External `curl
http://127.0.0.1:NNNN/api/users` returns the saved example body
with the saved status + headers. Stop button kills the listener
cleanly; closing API Lab kills any active mocks.

## Tradeoffs

- Sidecar lives in the API Lab process, not a separate daemon.
  Closing the app kills mocks. Phase L.3 covers the launchd
  "monitor when app closed" use case separately.
- v1 matches by `(method, path)` only — query string + body
  matching deferred. If multiple examples share the same
  `(method, path)`, the first one wins (deterministic).
- No Bearer token auth on the mock for v1. Bound to 127.0.0.1 +
  ephemeral port keeps the attack surface tiny. Optional auth is a
  P3 polish.
- No request log per mock (UI for "what hit my mock") — P3 polish.

## How to work on this

1. Verify Zig 0.16 net surface FIRST. Look at upstream
   `std/Io/net.zig` for server-side Address methods. If `bind` /
   `accept` aren't there, fall back to platform-specific `os.socket
   + os.bind + os.listen + os.accept`.
2. `src/handlers/http.zig` is the existing handler pattern — copy
   the Context struct + handler factory shape.
3. `src/main.zig` registers handlers + permission policies. Add
   `mock.start/stop/list` to the policy list (no `network`
   permission needed — listening is a different capability than
   making outbound calls; might need a new `mock-server` permission
   or just add to the existing `network` set).
4. `frontend/src/lib/types.ts:Example` already has `path` and
   `method` — reuse those for the matcher.

## Reference

- Frontend half ship: 2026-05-09 (this session)
- Plan section: `docs/plans/piped-dazzling-pretzel.md` § Phase L.1
- Zig 0.16 std API gotchas: `~/Herd/api-lab/CLAUDE.md`
