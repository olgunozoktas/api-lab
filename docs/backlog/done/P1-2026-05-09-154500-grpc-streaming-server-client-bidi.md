# Phase J.2 — gRPC streaming (server / client / bidi)

Priority: P1
Status: SHIPPED (server-streaming) — 2026-05-09

## Status

Server-streaming works end-to-end via a batched-collect approach
(grpcurl runs to completion, the handler emits all messages as an
array, the UI renders them as a numbered log). No streaming bridge
mechanism / polling — the existing single-shot `grpc.invoke` command
just returns N messages instead of one.

What landed:

- `src/handlers/grpc_messages.zig` — new file with `MessageIter`,
  a brace-balanced JSON splitter that walks grpcurl's stdout and
  emits each top-level object/array as a separate slice. String-
  aware (`{` inside a JSON string doesn't open a level), tolerant
  of pretty-printed multi-line objects, defensive on truncated
  output.
- `src/handlers/grpc.zig` — `runRequest` now uses the iterator and
  emits `messages: [...]` array + `message_count: N` in the JSON
  response. The legacy `message` field is dropped (it would have
  concatenated stream messages into one opaque blob — wrong).
- `frontend/src/lib/bridge.ts` — `GrpcResponse.messages: string[]`
  + `message_count: number`. Each entry is a JSON-string-encoded
  message body.
- `frontend/src/components/GrpcResponseSection.tsx` — Message tab
  renders one tree for unary (1 message) or a numbered list for
  streaming (N messages, `#1` / `#2` headers + a left accent border
  per item). Smooth visual transition between the two.
- `frontend/src/components/GrpcPanel.tsx` — synthetic error response
  in the catch block uses the new shape (`messages: []`).
- 12 new Zig tests for `parseMessages` (unary / server-streaming /
  pretty-printed / brace-in-string / escaped-quote / nested-objects
  / top-level array / unterminated tail / leading garbage).

LOC discipline: `grpc.zig` was at 411 after the inline
implementation; extracting `MessageIter` to `grpc_messages.zig`
brought it back to 353 (under the 400 cap).

Two follow-ups deferred to v2 (filed separately):

- **Client-streaming + bidi** — needs grpcurl stdin piping plus a
  staged-message UI (collect N messages, then send-close). Out of
  scope for v1 since the bridge runs request/response.
- **Live incremental streaming** — current pseudo-streaming buffers
  ALL messages and returns them at end. True live (poll N ms or
  emit events from native) would need either a polling bridge
  (grpc.streamPoll) or a zero-native upstream change for streaming
  invokes. The batched approach is fine for short-lived server
  streams; long-lived ones (chat, SSE-equivalent, watchers) will
  feel laggy until live streaming lands.

Acceptance: user points at a server-streaming gRPC method
(e.g. `grpc.health.v1.Health/Watch` on a server that supports it)
and sees N response messages stack in the Message tab with `#1`,
`#2`, `#3`, … headers. Unary calls behave identically to before
(single message, no header). Status pill + duration unchanged.

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
