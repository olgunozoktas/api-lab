# Phase J.2 — gRPC server-streaming + bidirectional streaming

Priority: P2

## Context

J.1 ships unary gRPC. Streaming (server-streaming, client-streaming, bidi) is the other half — gRPC's main differentiator vs REST.

## Items

- [ ] Extend `grpc.invoke` bridge command with a `streaming: "unary" | "server" | "client" | "bidi"` field
- [ ] grpcurl invocation differs per mode: server-streaming uses `-d @-` with newline-separated JSON messages on stdin; bidi runs a long-lived process
- [ ] gRPC composer mode: WebSocket-style message log for streaming methods, send-box for client/bidi
- [ ] Connection state pill (similar to WsPanel): IDLE / CONNECTED / STREAMING / CLOSED / ERROR
- [ ] Tests: parse grpcurl streaming output

## Acceptance

User connects to a gRPC server-streaming method (e.g. `helloworld.Greeter/SayHelloMany`) → sees responses arriving one-by-one in the log. Bidi method works with both incoming + outgoing logs.

## Tradeoffs

grpcurl streaming is line-based JSON; we render each line as a separate log entry.

## How to work on this

1. Phase J.1 first.
2. Reuse WsPanel-style log component from `frontend/src/components/WsPanel.tsx`.
