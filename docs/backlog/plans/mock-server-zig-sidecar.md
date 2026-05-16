# Plan — Mock server Zig sidecar (HTTP listener)

For: docs/backlog/P1-2026-05-09-180400-mock-server-zig-sidecar.md

## Item 1 research finding — the load-bearing decision

Zig 0.16 **does** have a server-side socket API:
`std.Io.net.IpAddress.listen(addr, io, opts) -> Server`, then
`Server.accept(io) -> Stream` (blocking), `Stream.reader/writer`,
`Server.deinit`. `Ip4Address.loopback(port)` gives 127.0.0.1.

**But** every call threads an `io: std.Io` — the zero-native runtime's
event-loop `Io`. That `Io` is not safe to drive from a spawned
`std.Thread`: a blocking `accept` on a worker thread sharing the
main-loop `Io` userdata is a data race.

**Decision: implement the listener with raw `std.posix` sockets**, not
`std.Io.net`. `std.posix.{socket,setsockopt,bind,listen,accept,
getsockname,read,write,shutdown,close}` are thin blocking syscalls with
no `Io` dependency — correct and safe for a worker-thread accept loop.
The backlog file anticipated exactly this fallback. `getsockname`
yields the ephemeral port when bound to port 0.

## Architecture

### `src/handlers/mock.zig` — the sidecar (split if >400 LOC)
- `MockServer` struct: listener fd, worker `std.Thread`, atomic
  `running` flag, owned copy of the example list, bound port, id.
- Accept loop (worker thread): blocking `posix.accept`; on stop,
  `posix.shutdown(fd,.recv)` + `posix.close(fd)` from the stopping
  thread makes the blocked `accept` return an error → loop sees
  `running == false` → exits → thread is joined.
- Per-connection: read the request line + headers into a fixed buffer
  (skip body, v1), parse `(method, path)`, match against examples,
  write `HTTP/1.1 <status>\r\n<headers>\r\n\r\n<body>`, close.
- Bind `127.0.0.1` only. Port 0 → ephemeral, read back via `getsockname`.
- `mock_http.zig` (if needed for the 400-LOC cap): pure request-line /
  header parsing + the `(method,path)` matcher + response formatting.

### `Context` — shared state
A `Context` holding a `std.AutoHashMap` of `id -> *MockServer` guarded
by a `std.Thread.Mutex` (bridge calls + accept threads both touch it).
Mirrors the `http.zig` Context + handler-factory shape.

### 3 bridge handlers (`src/main.zig` policy entries)
- `mock.start({collectionId, examples, port?})` -> `{id, port}`
- `mock.stop({id})` -> `{ok}`
- `mock.list()` -> `[{id, port, exampleCount, status}]`
All share one `Context`.

### App lifecycle
Process exit kills the listener threads — the OS reclaims the fds, so
"closing API Lab kills mocks" holds for free (matches the file's
tradeoff). If zero-native exposes a context destructor / quit hook,
add a `Context.deinit` that stops all servers cleanly; otherwise
process-exit is the v1 mechanism (documented).

### Frontend `MockControlPanel`
A panel (sidebar tab or floating) listing active mocks (id + port +
base URL), a per-request "Start mock" affordance for requests that
have examples, "Stop" + "Stop all". `bridge.ts` gains `mock.*` types.
Reuses `Example.path` / `Example.method` for the matcher input.

## Edge cases
- Port 0 + all ephemeral ports taken → `bind`/`listen` error → surfaced.
- Multiple examples sharing `(method,path)` → first wins (deterministic).
- `mock.stop` on an unknown id → `{ok:false}` or error, not a crash.
- Stop while a request is mid-flight → accept loop exits; in-flight
  connection completes or is dropped — acceptable for v1.
- Concurrent `mock.start` calls → mutex-guarded map insert.

## Risks
- `std.posix` raw sockets bypass `std.Io` — correct, but means the
  handler does blocking I/O off the bridge thread. The bridge call
  itself (`mock.start`) returns immediately; the thread outlives it.
- 400-LOC cap on `mock.zig` — likely needs the `mock_http.zig` split.
- The integration test needs network/socket capability in the test
  env — gate it behind a build flag (the file calls for this).

## Tests
- Zig unit: `(method,path)` matcher — pure, no socket.
- Zig unit: request-line + header parse.
- Zig integration (flag-gated): start on ephemeral port, connect a
  client socket, send a request, assert the example body comes back.
- Frontend: `mock.*` bridge command payload shape.

## Reuse audit (inline)
- `Context` + handler-factory shape — REUSE the `http.zig` pattern.
- `main.zig` policy registration — EXTEND the `command_policies` array.
- `Example` type (`path`, `method`, `body`, `headers`, `status`) —
  REUSE as the matcher input; no new type.
- `writeJsonString` / JSON response helpers in `http.zig` — REUSE for
  the bridge handler responses.
- `mock.zig`, `mock_http.zig`, `MockControlPanel.tsx` — CREATE.

## Status

Item 1 (research) complete — findings above. Items 2-6 not yet
implemented. This sidecar is a cached plan: a fresh `/backlog-ship
docs/backlog/P1-2026-05-09-180400-mock-server-zig-sidecar.md` run
picks it up via Path 3A and skips re-planning. Recommended as a
dedicated session — native sockets + threading + a frontend panel +
a socket integration test is a multi-hour build.
