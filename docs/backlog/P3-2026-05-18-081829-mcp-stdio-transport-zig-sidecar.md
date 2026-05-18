# MCP stdio transport via a Zig bridge sidecar

GitHub Issue: [#37](https://github.com/olgunozoktas/api-lab/issues/37)

Priority: P3

## Context

Follow-up to `docs/backlog/P2-2026-05-18-081623-integrations-gallery-provider-collections.md`
(the integrations gallery initiative, captured 2026-05-18). That item
adds an MCP protocol panel, but explicitly scopes its transport to
**HTTP/SSE only** — the sandboxed WKWebView cannot spawn child
processes, so stdio-based MCP servers are unreachable from the
frontend.

In practice, **most MCP servers run over stdio** (the default
transport for locally-installed servers). An MCP panel that only
speaks HTTP/SSE reaches a minority of the ecosystem. The fix is the
same pattern API Lab already uses for CORS-free HTTP: a native Zig
bridge handler that spawns the process and pipes its stdio, exposed
to the frontend as a bridge command.

Related: `src/handlers/http.zig` (the existing curl-subprocess
handler — the model to follow), `src/main.zig` (bridge command
registration + policy), the MCP panel item in the parent file.

## Items

- [ ] **`mcp.stdio` bridge command** — a Zig handler that spawns an
      MCP server process, writes JSON-RPC frames to its stdin, reads
      framed responses from its stdout, and returns them to the
      frontend. Mirror `src/handlers/http.zig`'s structure; register
      the command in `src/main.zig` with a `network`-equivalent
      permission and the `zero://app` origin guard.
      - Tests: `zig build test` handler unit tests — frame round-trip,
        process-spawn failure, malformed-frame handling.
- [ ] **Frontend stdio transport** — extend `lib/mcp.ts` so the MCP
      client can target a `stdio` transport (command + args) routed
      through the new bridge command, alongside the HTTP/SSE transport.
      - Tests: `lib/__tests__/mcp.test.ts` — transport selection,
        stdio frame encode/decode.
- [ ] **MCP panel transport picker** — let `<McpPanel>` choose
      HTTP/SSE vs stdio (command + args fields for stdio).
      - Ship-it-fully: the picker is visible in the panel; stdio is
        clearly marked as native-only (disabled when the bridge is
        unavailable, e.g. browser dev mode).

## Acceptance

API Lab can launch a stdio-based MCP server, list its tools, and
invoke one — entirely through the native bridge; the panel degrades
gracefully (stdio disabled) when the Zig bridge is not present.

## Tradeoffs & risks

Spawning arbitrary local processes is a real capability — the handler
must treat the command path as untrusted input and the permission
must be explicit. Process lifecycle (kill on panel close, zombie
reaping) needs care. Out of scope: an MCP server *registry* or
auto-discovery — this item is purely the transport.

## How to work on this

Land the `mcp.stdio` bridge command first, modelled on
`src/handlers/http.zig` — register it in `src/main.zig` and prove it
with `zig build test`. Then extend the frontend `lib/mcp.ts` transport
layer, then the panel picker. This item depends on the MCP panel from
the parent integrations item already existing (HTTP/SSE transport
shipped). Build: `./build.sh`; Zig tests: `zig build test`; frontend
tests: `cd frontend && dnpm run test`. Backlog file:
`docs/backlog/P3-2026-05-18-081829-mcp-stdio-transport-zig-sidecar.md`.
