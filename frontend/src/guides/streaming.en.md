---
title: WebSocket and SSE — streaming protocols
group: Protocols
order: 2
---

API Lab activates the right tab automatically based on the URL
scheme:

- `ws://` or `wss://` → WebSocket tab
- `sse://` or `sses://` → Server-Sent Events tab
- `grpc://` or `grpcs://` → gRPC tab
- everything else → HTTP composer

## WebSocket

1. Type `wss://echo.websocket.org` in the URL bar.
2. Click **Bağlan / Connect**. Status pill shows BAĞLANIYOR →
   AÇIK / OPEN.
3. Type a message in the send box, hit `⌘ Enter` or click **Gönder /
   Send**.
4. Incoming messages stream into the log. JSON is auto-detected and
   pretty-printed.

**Ping** sends a `"ping"` text frame — handy for liveness checks.
**Logu Temizle / Clear log** clears the in-tab history but doesn't
disconnect.

## Server-Sent Events

`sse://` and `sses://` (TLS) URLs open a one-way stream from the
server. Use it for:

- Real-time dashboards (CPU/memory/log feeds).
- Progress events from long-running operations.
- Chat-style assistant streams.

Events with named types (`event: foo\ndata: ...`) show the event
name as a tag. The **Last event ID** column captures the cursor
useful for resuming after reconnect.

## Reconnection

WebSocket: manual only — click **Bağlan / Connect** again.

SSE: the browser auto-reconnects on transient errors. **Yeniden
Bağlan / Reconnect** forces a fresh connection.
