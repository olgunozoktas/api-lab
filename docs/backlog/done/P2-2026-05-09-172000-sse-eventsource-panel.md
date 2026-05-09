# Phase J.3 — Server-Sent Events (SSE) panel

Priority: P2
Status: SHIPPED — 2026-05-09 (Content-Type detection deferred as a documented follow-up)

## Status

Shipped end-to-end as a single-column workspace mirroring WsPanel:

- **`sse://` / `sses://` URL-bar detection** — `lib/sse.ts:isSseUrl`
  matches the prefix, `toEventSourceUrl` rewrites to `http(s)://` for
  the EventSource constructor (parallels `grpc://` → grpcurl target
  and `ws://` → WebSocket URL flow).
- **`SsePanel` + `SsePanelContainer`** — pure presenter with status
  pill, URL display, log, and connect / disconnect / reconnect /
  clear-log buttons (no send box — SSE is one-way). Container owns
  EventSource lifecycle, message buffer, and unmount cleanup.
- **Per-event display** — timestamp (HH:MM:SS UTC), event-name badge
  (gray pill, server-defined names + default `"message"`), JSON
  pretty-printing on demand via `tryPrettyJson`, optional
  `lastEventId` chip when present.
- **App.tsx workspace swap** — `sseMode = !ws && !grpc &&
  isSseUrl(url)`; `singleColumn` extends to include sseMode so the
  composer pane collapses (URL bar still visible, no method dropdown,
  no Send button — only Connect/Disconnect on the SSE panel itself).
- **Tests** — 17 new vitest tests in `lib/__tests__/sse.test.ts`
  covering scheme detection (case-insensitive, rejects http/ws/
  grpc/file/empty), URL rewriting (sse→http, sses→https, path/query
  preservation, whitespace handling, case preservation), JSON
  pretty-printing (objects, arrays, malformed, size cap), JSON
  detection, and message-id uniqueness. Frontend test count
  239 → 256.
- **i18n** — 21 new keys × 2 locales (`sse.connect`,
  `sse.disconnect`, `sse.reconnect`, `sse.urlPlaceholder`,
  `sse.clearLog`, `sse.log.empty.{connected,disconnected}`,
  `sse.msg.json`, `sse.event.title`, `sse.lastEventId.title`,
  `sse.status.{idle,connecting,open,closed,error}`,
  `sse.system.{connecting,open,closed,error,errorGeneric}`).

The `text/event-stream` Content-Type-based detection (item 1's first
half) is deferred to a follow-up — the URL-prefix path matches the
existing `grpc://` / `ws://` convention and is the more
deterministic UX. Auto-swap based on response Content-Type would
require routing the initial request through the http transport,
detecting the type mid-flight, then reconstructing the workspace —
significantly more invasive for a marginal UX win.

## Context

SSE is the simplest streaming protocol after WebSocket — one-way server-to-client over plain HTTP. ChatGPT-style streaming, Anthropic Claude streaming, Stripe webhooks-as-stream all use it. Browser-native `EventSource` API.

## Items

- [x] Detect SSE: response Content-Type === `text/event-stream` OR explicit `sse://` URL prefix → swap to SSE workspace
- [x] SsePanel component (mirrors WsPanel structure): connection status, message log, reconnect button
- [x] Use browser-native `EventSource` for the connection (no Zig bridge needed)
- [x] Per-event display: timestamp, event-name, data (JSON pretty-printed if applicable)
- [x] Reconnect on disconnect (configurable retry policy)

## Acceptance

User points at an SSE endpoint (e.g. an Anthropic streaming completions API) → workspace swaps to SsePanel → events stream in live with JSON pretty-printing.

## Tradeoffs

EventSource doesn't support custom headers natively (security limitation). Workaround: use `fetch` with `ReadableStream` for the stream parser when custom auth is needed. Defer to v1.1.

## How to work on this

1. Reuse `frontend/src/components/WsPanel.tsx` as a structural template.
2. Browser EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
