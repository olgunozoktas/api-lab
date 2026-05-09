# Phase C — WebSocket + Code generation

GitHub Issue: [#2](https://github.com/olgunozoktas/api-lab/issues/2)

Priority: P2

## Context

Adds protocol breadth (WebSocket) and developer ergonomics (export request as code).

## Items

- [ ] `WsPanel` component using browser-side `WebSocket` API (no CORS for ws://wss://)
- [ ] Message log, send box, ping helper, JSON-message tagging
- [x] Code generators (`lib/codegen/*.ts`): curl, fetch, axios, python-requests, Go net/http, Node.js
- [x] "Copy as ..." dropdown in response head bar
- [x] Full URL/header/body/auth substitution in generated code

## Acceptance

WebSocket connects to wss://echo.websocket.org, sends + receives.
"Copy as curl" + "Copy as fetch" generate valid code.

## Status

**Code-gen half shipped 2026-05-09** (worktree `feat/websocket-codegen`).
Six formatters live (cURL / fetch / axios / python-requests / Go net/http
/ Node.js https). "Copy as code" dropdown replaces the old single-purpose
"Copy as cURL" button in `ResponseHead`. Env / auth substitution flows
through the existing `sendRequest.ts` builders, so the emitted code is
copy-paste-runnable.

WebSocket half (items 1-2) intentionally deferred — different concern
(stateful protocol vs pure formatters), different complexity, different
acceptance. Stays in this file rather than being moved to a new one so
GitHub issue #2 keeps a single source of truth.

## Follow-ups (from Step 8 ultrathink)

- `P3-2026-05-09-094000-codegen-redact-secrets.md` — toggle that
  replaces `Authorization`, `Cookie`, `X-Api-Key` header values with
  `<REDACTED>` in generated snippets so users can paste into bug reports
  / pair-programming sessions safely.
- `P3-2026-05-09-094100-ui-component-tests.md` — set up
  `@testing-library/react` + `jsdom` so leaf components (`CopyAsMenu`,
  `QuickSwitcher`, `TabStrip`) get behavior tests, not just store-action
  tests.
