# Phase J.1 — gRPC unary via grpcurl bridge

Priority: P1

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

- [ ] New `src/handlers/grpc.zig` — wraps `grpcurl` subprocess
- [ ] New bridge command `grpc.invoke({target, fullMethod, message, metadata, plaintext?, useReflection?, importPaths?})` returning `{status, message, headers, trailers, durationMs, error?}`
- [ ] gRPC mode swap in `App.tsx` — when URL starts with `grpc://`, layout swaps to a gRPC composer (similar to how `wsMode` swaps for WebSocket)
- [ ] gRPC composer: target host, full method (e.g. `helloworld.Greeter/SayHello`), reflection toggle, .proto file picker, metadata K/V table, message JSON editor
- [ ] Response viewer: pretty-print message JSON, headers, trailers, status code (gRPC status, not HTTP), duration
- [ ] grpcurl as a dependency: detect via `command -v grpcurl`, surface install hint if missing
- [ ] Tests: handler argv assembly + parsing of grpcurl output

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
