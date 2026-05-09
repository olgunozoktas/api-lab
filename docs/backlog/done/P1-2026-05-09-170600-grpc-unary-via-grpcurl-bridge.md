# Phase J.1 — gRPC unary via grpcurl bridge

Priority: P1
Status: SHIPPED — 2026-05-09

## Status

Full unary gRPC works end-to-end through the new `grpc.invoke` bridge
command (`src/handlers/grpc.zig` mirrors `http.zig`'s shape — Context
+ handler factory + pure `buildArgv` + `parseVerboseStderr` helpers
+ `runRequest` orchestrator). Imports `writeJsonString` /
`formatError` / `formatTransportError` from `http.zig` instead of
duplicating the JSON-escape logic.

Frontend lands a complete `grpcMode` swap parallel to `wsMode`: when
the URL bar starts with `grpc://` or `grpcs://`, the layout collapses
to a single column hosting `GrpcPanelContainer` (split into
`GrpcPanel.tsx` + `GrpcResponseSection.tsx` to stay under the 400-LOC
cap). The composer carries Message / Metadata / Proto tabs; the
viewer carries Message / Headers / Trailers / Raw tabs. KvTable is
reused for the metadata UI; Tabs primitive (Radix) is reused for both
tab strips; `@uiw/react-json-view` is reused for the response message
tree (same component as the HTTP response body).

`grpcurl` missing on PATH is detected via `error.FileNotFound` from
`std.process.run` and surfaced as a structured
`{error: "grpcurl_missing", install_hint: "brew install grpcurl",
docs: "https://github.com/fullstorydev/grpcurl#installation"}` JSON
error — the GrpcPanel viewer renders an install-hint card with the
brew command and a link to the docs.

Three follow-ups filed (yesterday's placeholder
`P2-…171900-grpc-server-streaming-bidi.md` was deleted in favor of
the new P1):

- `P1-2026-05-09-154500-grpc-streaming-server-client-bidi.md` —
  Phase J.2: server-stream / client-stream / bidi.
- `P2-2026-05-09-154501-grpc-tls-mtls-cacert-cert-key.md` — TLS
  posture options (custom CA, client cert/key, servername, authority).
- `P2-2026-05-09-154502-grpc-reflection-service-browser.md` —
  reflection-driven service browser with skeleton-message generation.

Acceptance: user points at `grpc://grpcb.in:9001`, types
`hello.HelloService/SayHello`, sends `{"greeting":"world"}`, sees
the unary response with status pill + headers + trailers + duration.

## Context

gRPC is the second-most-asked protocol after REST in modern
back-end work. Postman/Insomnia/Bruno all support it. We don't yet
— this is a hard parity gap.

Decision (`docs/plans/piped-dazzling-pretzel.md` § Eng lens):
extend the bridge with a new `grpc.invoke` command that shells out
to `grpcurl`. Same pattern as the existing curl-based HTTP handler.
Tested binary, supports all streaming modes (this slice only does
unary; J.2 covers streaming).

## Items

- [x] New `src/handlers/grpc.zig` — wraps `grpcurl` subprocess
- [x] New bridge command `grpc.invoke({target, fullMethod, message, metadata, plaintext?, useReflection?, importPaths?})` returning `{status, message, headers, trailers, durationMs, error?}`
- [x] gRPC mode swap in `App.tsx` — when URL starts with `grpc://`, layout swaps to a gRPC composer (similar to how `wsMode` swaps for WebSocket)
- [x] gRPC composer: target host, full method (e.g. `helloworld.Greeter/SayHello`), reflection toggle, .proto file picker, metadata K/V table, message JSON editor
- [x] Response viewer: pretty-print message JSON, headers, trailers, status code (gRPC status, not HTTP), duration
- [x] grpcurl as a dependency: detect via `command -v grpcurl`, surface install hint if missing
- [x] Tests: handler argv assembly + parsing of grpcurl output

## Acceptance

User points at `grpc://grpcb.in:9001` (a public test server),
selects `hello.HelloService/SayHello` via reflection, sends
`{"greeting":"world"}`, sees a successful unary response.

## Tradeoffs

grpcurl is an external dependency. We could also vendor it via a
Zig-side gRPC client (massive lift) or use a Rust sidecar. grpcurl
is the right v1 — proven, supports everything, ~10 MB binary.

## How to work on this

1. Read `src/handlers/http.zig` for the subprocess pattern.
2. Install grpcurl: `brew install grpcurl`.
3. Reflection flag: `grpcurl -d '{}' addr:port service.Method`.
4. Defer streaming to J.2 — single-response unary first.
