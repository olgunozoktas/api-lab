# mcp.stdio — spawn timeout + kill on a non-exiting server

Priority: P3

## Context

Follow-up to `docs/backlog/done/P3-2026-05-18-081829-mcp-stdio-transport-zig-sidecar.md`
(shipped 2026-05-19). The `mcp.stdio` Zig handler spawns an MCP server,
feeds it JSON-RPC frames over a finite stdin file, and `child.wait()`s
for it to exit on stdin EOF. A well-behaved MCP server exits when its
stdin closes — but a misbehaving or hung server never does, and
`child.wait()` has no timeout, so that bridge call blocks indefinitely.

The handler already `defer child.kill()`s on the error paths; what's
missing is a *deadline* on the wait itself.

## Items

- [ ] **Bounded wait** — give `runStdio` a timeout (the request's
      `timeout_ms`, default ~30 s). If the server hasn't exited by
      then, `kill` it and return `{error: "timeout"}` instead of
      hanging the bridge thread.
      - Tests: `zig build test` — a sleeper command that never exits
        is killed and reported as a timeout.

## Acceptance

A stdio MCP server that never exits on stdin EOF is killed after the
timeout and the bridge call returns a `timeout` error; a normal server
still completes well within the deadline.

## Tradeoffs & risks

`std.process.run` accepts a `timeout` in its options but hardcodes
`stdin = .ignore`; the `mcp.stdio` handler spawns via `std.process.spawn`
directly (it needs a stdin file). Reproducing `run`'s timeout behavior
means either a timed wait primitive or a watchdog — check the Zig 0.16
`Io.Timeout` API the `RunOptions.timeout` field feeds into.

## How to work on this

`src/handlers/mcp.zig` — `runStdio`'s `child.wait(io)` is the call to
bound. Look at how `std.process.run` (in the Zig std) applies
`options.timeout` and mirror it. `zig build test`. Backlog file:
`docs/backlog/P3-2026-05-19-210302-mcp-stdio-spawn-timeout.md`.
