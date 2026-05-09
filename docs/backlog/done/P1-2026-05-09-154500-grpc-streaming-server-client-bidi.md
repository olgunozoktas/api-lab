# Phase J.2 — gRPC streaming (server / client / bidi)

Priority: P1

## Context

Follow-up to `docs/backlog/done/P1-2026-05-09-170600-grpc-unary-via-grpcurl-bridge.md`
(shipped 2026-05-09). Unary gRPC works end-to-end via `grpcurl`. The
parent file explicitly punted streaming to J.2 because the unary path
was the v1 critical-path. Now that the bridge + composer + viewer
exist, streaming is the obvious next move.

Three streaming modes:

- **Server streaming** — client sends one request, server emits N responses (e.g. log tail, file download).
- **Client streaming** — client emits N requests, server replies once (e.g. metric upload).
- **Bidi streaming** — both sides emit N messages independently (e.g. chat, RPC pipelining).

Postman/Insomnia/Bruno all support these. Without them, API Lab is a
"unary-only" gRPC tester — fine for many use cases but a hard limit
for anyone testing real-world streaming services (notably anything
chat / event-bus / observability).

## Items

- [ ] Detect stream type from the resolved method descriptor (grpcurl
      surfaces this in `-vv` output: `rpc Method ( stream X ) returns
      ( stream Y )`). Pass it back from the handler so the UI can
      render the right composer + viewer shape.
- [ ] Server streaming: send one request → receive N responses,
      append each to the viewer log as they arrive. grpcurl streams
      stdout (one JSON object per line by default with `-format json`).
- [ ] Client streaming: collect N user-typed messages, pipe them
      into grpcurl's stdin (`-d @-` reads from stdin). Add a "Send
      next" button + a list of staged messages.
- [ ] Bidi: combine both — input list + output log running side by
      side, separate "send" + "close-send" controls.
- [ ] Cancel flow: a "Cancel" button that sends SIGTERM to the
      grpcurl child process. Bridge needs a way to surface a child
      handle to JS — likely a new `grpc.cancel(call_id)` command or
      pass a cancellation signal via the existing run.
- [ ] Bridge: the existing `runRequest` is request/response. For
      streaming we need either (a) a streaming bridge mechanism
      (zero-native upstream) or (b) split into multiple `grpc.invoke`
      variants (`grpc.invoke.serverStream`, `grpc.invoke.clientStream`,
      `grpc.invoke.bidi`). Decision needed early in the slice.
- [ ] Tests: argv assembly per mode; streaming-output parsing
      (multiple JSON messages on stdout); cancellation behavior.

## Acceptance

User points at a server-streaming method (e.g. `grpc.health.v1.Health/Watch`),
sees responses arrive incrementally in the message viewer with
timestamps. Cancel button stops the stream cleanly. Client streaming
+ bidi work against the standard grpcurl test servers (`grpcb.in`).

## Tradeoffs

The single-shot `bridge.invoke` request/response model doesn't fit
streaming naturally. Two paths:

- **A. Pseudo-streaming via grpcurl polling**: the handler runs
  grpcurl + buffers stdout, the JS side polls for incremental
  results via repeat invocations. Hacky but doesn't need upstream
  zero-native changes. Acceptable for v1 of streaming.

- **B. Real streaming bridge**: zero-native gains a streaming
  invoke mechanism (event emitter from native to JS). Cleaner
  architecturally but requires upstream PR + zero-native release
  cycle.

Recommend Path A for J.2, then upgrade to Path B once the upstream
streaming mechanism lands. The UI shape stays the same; only the
plumbing underneath changes.

## How to work on this

1. Read `src/handlers/grpc.zig` for the unary handler shape.
2. Run `grpcurl -vv -plaintext grpcb.in:9001 list` to inspect the
   public test server's streaming methods.
3. Test against `grpc.testing.TestService` (the canonical gRPC test
   service exposed by grpcb.in).
4. For Path A: spawn grpcurl with stdout piped, return a `call_id`,
   add `grpc.poll(call_id)` to fetch incremental output + state
   ("running" / "completed" / "errored").
5. UI: extend GrpcPanel with a streaming-aware viewer that appends
   messages in real time (similar to WsPanel's message log but
   with gRPC framing).
