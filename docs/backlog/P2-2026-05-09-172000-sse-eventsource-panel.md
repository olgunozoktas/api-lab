# Phase J.3 — Server-Sent Events (SSE) panel

Priority: P2

## Context

SSE is the simplest streaming protocol after WebSocket — one-way server-to-client over plain HTTP. ChatGPT-style streaming, Anthropic Claude streaming, Stripe webhooks-as-stream all use it. Browser-native `EventSource` API.

## Items

- [ ] Detect SSE: response Content-Type === `text/event-stream` OR explicit `sse://` URL prefix → swap to SSE workspace
- [ ] SsePanel component (mirrors WsPanel structure): connection status, message log, reconnect button
- [ ] Use browser-native `EventSource` for the connection (no Zig bridge needed)
- [ ] Per-event display: timestamp, event-name, data (JSON pretty-printed if applicable)
- [ ] Reconnect on disconnect (configurable retry policy)

## Acceptance

User points at an SSE endpoint (e.g. an Anthropic streaming completions API) → workspace swaps to SsePanel → events stream in live with JSON pretty-printing.

## Tradeoffs

EventSource doesn't support custom headers natively (security limitation). Workaround: use `fetch` with `ReadableStream` for the stream parser when custom auth is needed. Defer to v1.1.

## How to work on this

1. Reuse `frontend/src/components/WsPanel.tsx` as a structural template.
2. Browser EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
