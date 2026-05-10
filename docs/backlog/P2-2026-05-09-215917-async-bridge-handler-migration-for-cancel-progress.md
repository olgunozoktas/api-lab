# Async bridge-handler migration — http.request → AsyncHandler

Priority: P2

## Context

Follow-up to `docs/backlog/P2-2026-05-09-170800-request-cancellation-progress.md`
(partial-shipped 2026-05-09 — items 1, 2, 3, 6 landed; items 4 and 5
blocked on this migration).

The zero-native bridge currently dispatches handlers synchronously on
the WKWebView main thread. Concretely:

- `~/Herd/zero-native/src/platform/macos/appkit_host.m:139` —
  `userContentController:didReceiveScriptMessage:` calls into Zig.
- `~/Herd/zero-native/src/bridge/root.zig:159` — `Dispatcher.dispatch`
  invokes `handler.invoke_fn(...)` and awaits its return synchronously.

While `http.request` is blocked inside `std.process.run` waiting for
curl, NO other bridge handler can run. A separate `http.cancel`
IPC call from JS would queue behind the in-flight request — useless
for cancellation. Same blocker for streaming progress callbacks
(item 5 of the parent file): the bridge can't push events back to
JS while the originating call is in flight, AND the JS side can't
poll because every poll would also queue.

The fix already exists in zero-native's bridge module but isn't wired:
`bridge/root.zig:108` defines `AsyncHandler` + `AsyncResponder` +
`AsyncRegistry`. The dispatcher's `dispatch` function only consults
the sync `Registry`, never the `async_registry`. Wiring async dispatch
unblocks both true subprocess cancellation AND progress events.

## Items

- [ ] Extend `Dispatcher.dispatch` in zero-native to consult
      `async_registry` when a command isn't found in the sync
      registry. Sync handlers still default; async handlers opt in
      explicitly via the registry.
- [ ] Async handler signature: `fn(ctx, invocation, responder) !void`.
      The handler returns immediately; the responder closes the
      response channel later (potentially from a worker thread).
      Define the worker-thread → main-thread response-marshalling
      pattern (likely a queue + main-thread drain).
- [ ] Migrate `src/handlers/http.zig` from sync `handler` to
      `asyncHandler`. Spawn curl via `Child.spawn` (not
      `process.run`), capture PID into a shared registry keyed by
      request_id, then `Child.wait` on a worker thread.
- [ ] New cancellation registry in `src/handlers/http.zig`: a
      `Mutex`-protected `HashMap(request_id → PID)`. Worker threads
      register on spawn, deregister on Child.wait return; the
      `http.cancel` async handler reads the PID + sends SIGTERM via
      `std.posix.kill(pid, SIG.TERM)`.
- [ ] Add the `http.cancel` bridge command + permissions entry in
      `src/main.zig`'s `command_policies`. Origin same as
      `http.request`. Payload: `{request_id: string}`.
- [ ] Wire frontend `viaNative` to call `bridge.invoke('http.cancel',
      {request_id})` when the AbortSignal fires. Replace the current
      soft-cancel race-against-abort with a true cancel that sends
      SIGTERM. Update the existing `sendRequestCancel.test.ts` to
      assert the bridge call gets fired on abort.
- [ ] Tests: zig test for the cancellation registry under contention
      (two threads register concurrently, third reads). Frontend
      tests for hard-cancel path (mock bridge.invoke for both
      `http.request` and `http.cancel`).

## Acceptance

User fires a request to `httpbin.org/delay/30`. After 1 second hits
⌘+. or red Cancel button. Within 100ms the curl subprocess receives
SIGTERM and exits. Bridge thread is freed; the next `Send` for a new
request starts immediately, no queued-behind-old-curl lag.

Verification: `ps aux | grep curl` during the cancel window shows the
curl PID disappearing within ~50ms of the cancel button click.

## Tradeoffs

The async handler API is the right primitive for any long-running
bridge command — gRPC streaming, SSE relays, file uploads with
progress. So this migration unblocks far more than just cancellation.
But it touches the zero-native dispatcher (cross-project), which has
its own test surface and back-compat concerns. Coordinate with any
other zero-native consumer.

The worker-thread response marshalling adds one round-trip on the
hot path (sync handlers stay zero-overhead; async handlers pay a
queue dispatch). For chatty bridges this could matter; for
api-lab's gRPC + HTTP testing workflow it's a net win.

Migration risk: the existing `http.request` handler has solid test
coverage. The migration must preserve all existing
behaviors (timeout, redirects, headers, body shape) — keep the
worker-thread payload identical to the current sync handler's
output, only the dispatch model changes.

## How to work on this

1. Read `bridge/root.zig` lines 80-168 — the AsyncHandler /
   AsyncResponder definitions exist but `Dispatcher.dispatch` only
   uses `self.registry`, never `self.async_registry`. That's the
   first wire-up.
2. Pick the worker-thread pattern. Options: `Thread.spawn` per
   handler invocation (simple, allocs a stack per call), or a
   bounded thread pool (more efficient but needs a job queue).
   For api-lab's load (1-10 concurrent requests typical),
   per-call `Thread.spawn` is fine.
3. Main-thread response delivery: WKWebView's
   `evaluateJavaScript:completionHandler:` must run on the main
   thread. The worker thread queues a response payload + request_id;
   main thread drains the queue (probably via a CFRunLoopSource or
   dispatch_async to main). Coordinate with zero-native's existing
   main-loop integration.
4. Once async dispatch works, the `http.request` migration is
   mostly mechanical: split `invoke` into "spawn curl + register
   PID" (sync, registers the work) + "wait + format response"
   (worker thread, calls `responder.success(...)` when done).
   The `http.cancel` handler is small — read PID from registry,
   call `std.posix.kill`.
5. Frontend changes are minimal: when `signal.aborted` fires in
   `viaNative`, fire `bridge.invoke('http.cancel', {request_id})`
   alongside the AbortError throw. The bridge call is fire-and-
   forget — the worker thread will exit naturally once curl dies.
