# SSE — custom request headers via fetch + ReadableStream

Priority: P2

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-172000-sse-eventsource-panel.md`
(shipped 2026-05-09). The parent file's Tradeoffs section flagged this
as the v1 limitation:

> EventSource doesn't support custom headers natively (security
> limitation). Workaround: use `fetch` with `ReadableStream` for the
> stream parser when custom auth is needed. Defer to v1.1.

Today the SSE panel uses browser-native `EventSource`, which is
clean but cannot send `Authorization: Bearer …`, custom API keys, or
any header beyond cookies. The most common modern SSE use cases —
**Anthropic Claude streaming**, **OpenAI streaming completions**,
**Stripe webhook-as-stream** — all require bearer auth. So the panel
shipped is functionally locked to the smaller subset of public /
cookie-auth SSE endpoints.

The fix: implement a tiny SSE parser on top of `fetch` +
`ReadableStream`. Same panel UI; different transport under the hood.
The wire format is well-defined (RFC 8895 / WHATWG HTML living
spec); the parser is ~50 LOC.

## Items

- [ ] New `lib/sseStreamParser.ts` — incremental SSE parser. Stateful
      walker over `Uint8Array` chunks. Emits `{eventName, data,
      lastEventId, retry}` objects per complete event (terminator
      = blank line). Handles UTF-8 partial sequences across chunk
      boundaries.
- [ ] Tests for the parser — single-event, multi-event in one chunk,
      event split across chunks, empty data lines, multi-line data
      (`data: a\ndata: b\n\n` → `"a\nb"`), comment lines (`: heartbeat`),
      retry-only events.
- [ ] `SsePanelContainer` toggle: when the request has metadata
      headers / auth → use fetch+stream path; else use EventSource
      (faster, browser-native auto-retry).
- [ ] Auth + headers UI for SSE — bring back the AuthPanel / KvTable
      headers that today are hidden in single-column SSE mode.
      Could surface as a small "Headers" disclosure above the SSE
      log, only when the fetch path is active.
- [ ] AbortController plumbed through so Disconnect cancels the in-
      flight stream cleanly.
- [ ] Manual reconnect cursor: pass `Last-Event-ID: <lastEventId>`
      header on reconnect when the user has seen events.

## Acceptance

User points API Lab at `https://api.anthropic.com/v1/messages` with
`Authorization: Bearer ant-...` + `anthropic-version: 2023-06-01` +
the streaming-completions request body, hits Connect, sees streaming
deltas land in the log live (with JSON pretty-print on each chunk).
Disconnect cuts the stream immediately.

## Tradeoffs

The fetch+stream path loses the browser's automatic retry behavior;
we have to implement reconnect ourselves (or punt — manual reconnect
button is already wired). Acceptable for v1 since EventSource users
get auto-retry and fetch-path users opt in by setting headers.

`Last-Event-ID` reconnect cursor support is server-dependent (only
some servers honor it). Surface it as a "(reconnecting from
event {id})" hint in the log so the user knows what's happening.

## How to work on this

1. Read `lib/sse.ts` for the existing SSE message shape — the new
   parser's output should match `SseMessage` so no UI changes.
2. WHATWG SSE spec: https://html.spec.whatwg.org/multipage/server-sent-events.html
3. The existing `EventSource` path stays (it's faster + browser
   handles auto-retry); only NEW flag `useFetchPath = true` triggers
   the new transport.
