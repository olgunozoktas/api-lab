# Phase C — WebSocket + Code generation

Priority: P2

## Context

Adds protocol breadth (WebSocket) and developer ergonomics (export request as code).

## Items

- [ ] `WsPanel` component using browser-side `WebSocket` API (no CORS for ws://wss://)
- [ ] Message log, send box, ping helper, JSON-message tagging
- [ ] Code generators (`lib/codegen/*.ts`): curl, fetch, axios, python-requests, Go net/http, Node.js
- [ ] "Copy as ..." dropdown in response head bar
- [ ] Full URL/header/body/auth substitution in generated code

## Acceptance

WebSocket connects to wss://echo.websocket.org, sends + receives.
"Copy as curl" + "Copy as fetch" generate valid code.
