# Phase C — WebSocket + Code generation

GitHub Issue: [#2](https://github.com/olgunozoktas/api-lab/issues/2)

Priority: P2

## Context

Adds protocol breadth (WebSocket) and developer ergonomics (export request as code).

## Items

- [x] `WsPanel` component using browser-side `WebSocket` API (no CORS for ws://wss://)
- [x] Message log, send box, ping helper, JSON-message tagging
- [x] Code generators (`lib/codegen/*.ts`): curl, fetch, axios, python-requests, Go net/http, Node.js
- [x] "Copy as ..." dropdown in response head bar
- [x] Full URL/header/body/auth substitution in generated code

## Acceptance

WebSocket connects to wss://echo.websocket.org, sends + receives.
"Copy as curl" + "Copy as fetch" generate valid code.

## Status

**Both halves shipped 2026-05-09.**

- Code-gen half (items 3-5) shipped via `feat/websocket-codegen` (merge `b331e47`).
- WebSocket half (items 1-2) shipped via `feat/websocket`.

## Follow-ups (from Step 8 ultrathink)

Code-gen slice:

- `P3-2026-05-09-094000-codegen-redact-secrets.md` — toggle that
  replaces `Authorization`, `Cookie`, `X-Api-Key` header values with
  `<REDACTED>` in generated snippets so users can paste into bug reports
  / pair-programming sessions safely.
- `P3-2026-05-09-094100-ui-component-tests.md` — set up
  `@testing-library/react` + `jsdom` so leaf components (`CopyAsMenu`,
  `QuickSwitcher`, `TabStrip`) get behavior tests, not just store-action
  tests.

WebSocket slice:

- `P3-2026-05-09-101500-ws-per-tab-persistence.md` — preserve WebSocket
  connections across tab switches. v1 closes the socket on tab change.
- `P3-2026-05-09-101600-ws-history-recording.md` — log WS sessions into
  the History sidebar (currently only HTTP requests are recorded).
