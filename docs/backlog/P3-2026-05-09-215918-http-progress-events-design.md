# HTTP request progress events — design + implementation

Priority: P3

## Context

Follow-up to `docs/backlog/P2-2026-05-09-170800-request-cancellation-progress.md`
(partial-shipped 2026-05-09 — item 5 deferred to here).

The parent file's item 5 asked for a thin progress bar under the URL
bar fed by an `onProgress({sent, received, total?})` callback. Two
unsolved questions:

1. **Bridge protocol shape.** Streaming progress from Zig back to JS
   needs an event-emit channel. Today's bridge is request/response —
   one call returns one result. Even with the AsyncHandler migration
   (sibling P2 follow-up), AsyncResponder's `success(id, result)`
   delivers ONE final response, not a stream of progress chunks.
2. **Per-path implementation.**
   - Native curl: parse `--progress-bar` stderr incrementally, or
     emit `--write-out` per-chunk metrics if curl supports that.
   - Fetch path: wrap `Response.body` with a `ReadableStream` reader
     and accumulate `received` bytes per `read()` call; surface via
     same callback.

Decision blocked on bridge work. Once async dispatch lands, the
event channel can be designed (event-emit handlers? A separate
`http.progress` callback channel keyed by request_id?).

## Items

- [ ] Decide bridge protocol for progress events. Two strawman options:
      (a) AsyncResponder gains an `event(id, payload)` method that
      delivers non-final events; JS side `bridge.invoke` returns a
      stream-like handle. (b) New side-channel command pattern —
      JS subscribes to `http.progress` events with a request_id
      filter. Pick one with the zero-native maintainers.
- [ ] Frontend: add a thin progress bar under the URL bar in
      `UrlBar.tsx` (animated 0-100% when total is known, or
      indeterminate shimmer when not). Hidden when `progress.received
      === 0` and shown only during `busy === true`.
- [ ] Native (Zig) path: extend the `http.request` async handler to
      parse curl's `--progress-bar` stderr line-by-line and emit
      `{sent, received, total?}` events between spawn and Child.wait.
- [ ] Fetch path: in `viaFetch`, wrap `res.body` with a
      `getReader().read()` loop, accumulate byte count, fire the
      progress callback. Replace the current `res.arrayBuffer()` call
      with the streaming variant.
- [ ] `SendOptions` (lib/sendRequest.ts) gains
      `onProgress?: (p: { sent: number; received: number; total?: number }) => void`.
      App.tsx wires it to a Zustand store slice (or local state) that
      drives the progress bar.
- [ ] Tests: viaFetch with mocked `Response.body.getReader()` returning
      chunks; assert the callback fires per-chunk with monotonically
      increasing `received` values. Native path: smoke test for the
      Zig stderr parser (pure function over a sample
      `--progress-bar` output).

## Acceptance

User fires a 5MB download to `httpbin.org/bytes/5000000`. The progress
bar fills smoothly from 0% to 100% during the download. Cancellation
mid-progress works (signal aborts, bar disappears). Both fetch and
native paths exercise the callback.

## Tradeoffs

Curl's `--progress-bar` writes to stderr in a non-line-oriented format
(carriage-return overwrites). The Zig parser needs to handle CR-based
overwrites correctly. Alternative: use `--silent` + `--write-out` with
periodic interval (curl 7.71+ supports `%{download_speed}` /
`%{progress_pct}` in write-out, but only at request end, not
streaming). The CR-aware stderr parse is the realistic path.

For fetch: streaming the body via `getReader()` means we lose the
single-shot `arrayBuffer()` call — need to accumulate chunks
ourselves. Cost is small (one extra TextDecoder pass at the end) but
the diff to viaFetch is non-trivial.

The progress events are best-effort; if the parsing fails we fall
back to the existing "spinner only" UX. Don't let progress complexity
gate cancellation.

## How to work on this

1. Wait for the sibling P2 (async-bridge-handler-migration) to land —
   the event channel is the prerequisite.
2. Sketch the protocol with the zero-native maintainers. Most likely
   shape: `AsyncResponder.event(id, payload)` for in-flight events
   plus the existing `success(id, result)` for the final response.
3. Native parser: write a pure function `parseCurlProgressLine(stderr_line) ?ProgressTick`.
   Test against captured `--progress-bar` output samples. Handle
   CR-based overwrites by splitting on `\r` not `\n`.
4. Frontend: `UrlBar.tsx` already has the right home for a thin
   progress bar (above the URL input row). Use a CSS transition for
   the width change so updates feel smooth even at low frequency.
5. Wire via App.tsx: pass `onProgress` into `send()` options, store
   the latest tick in `useState`, render the bar conditionally.
