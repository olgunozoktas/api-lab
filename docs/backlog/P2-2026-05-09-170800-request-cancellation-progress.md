# [BLOCKED] Phase E.2 — Request cancellation + progress

Priority: P2

## Context

Today the Send button is a footgun on big requests — once fired,
no way to abort except waiting for timeout. Real-world API testing
hits APIs that occasionally hang for 30s+. Need a cancel.

Also: progress for streaming downloads (large response, file
upload) — Postman has this, we don't.

## Items

- [x] Send button morphs to red "Cancel" while in-flight (busy state already exists in App.tsx onSend)
- [x] ⌘+. (period) keyboard shortcut to cancel current request
- [x] AbortController for the fetch path: pass `signal` through `lib/sendRequest.ts:viaFetch`
- [ ] Native curl path: extend the bridge handler to track in-flight subprocess PIDs; new bridge command `http.cancel({requestId})` sends SIGTERM
- [ ] Optional progress callback: `onProgress({sent, received, total?})` — surface as a thin progress bar under the URL bar
- [x] Toast on cancel: "Request cancelled"

## Acceptance

User fires a request to `httpbin.org/delay/10`, hits ⌘+. or the
red Cancel button, sees the toast, and can immediately fire a new
request. Native and fetch paths both work.

## Tradeoffs

Subprocess cancel via SIGTERM is graceful but not instant (curl
has a small grace period). For UX we surface the cancel
immediately and accept the late-arriving response is dropped.

## How to work on this

1. Read `frontend/src/App.tsx:onSend` and `frontend/src/lib/sendRequest.ts:send`.
2. Use AbortController for fetch path (browser-native).
3. For Zig path, add request-id mapping in `src/handlers/http.zig`.

## Status — partial ship 2026-05-09 (UTC), remainder BLOCKED 2026-05-17

Items 1-3 + 6 shipped and merged to `main`. Items 4 (native PID
cancel) and 5 (progress callback) are blocked on a zero-native bridge
change and **fully delegated** to the two follow-up files below — those
files are the live trackers for the remaining work. Title prefixed
`[BLOCKED]` so `/backlog-next` skips this parent; the unchecked items
4+5 stay unchecked (they are genuinely not done) but are not picked up
again here. Unblock + close this file once the async-bridge migration
(`P2-2026-05-09-215917-async-bridge-handler-migration-for-cancel-progress.md`)
lands and items 4+5 are implemented against it.

Shipped 4 of 6 items end-to-end on `feat/request-cancellation`. Items
4 (native PID cancel) and 5 (progress callback) deferred to follow-up
backlog files — the deferral has a clear architectural rationale
documented in **Follow-ups** below.

**What landed:**

- `AbortSignal` plumbed through `lib/sendRequest.ts`: new optional
  `SendOptions` parameter on `send` / `sendWithScripts`; `viaFetch`
  passes the signal directly to the browser-native `fetch` (real
  cancellation); `viaNative` runs a `Promise.race` against the
  signal — abort wins → `AbortError` thrown immediately so the UI
  returns to ready (soft cancel; see Follow-ups for why hard cancel
  needs the bridge migration).
- `App.tsx` owns an `AbortController` ref. Each `onSend` creates a
  fresh controller, threads `controller.signal` into `send()`, and
  the new `onCancel` callback fires `controller.abort()`. Cancel
  triggers the `AbortError` path which routes to a cancel-specific
  toast (skipping the generic network-error path).
- Send button morphs to a red `<X> Cancel` button while busy when an
  `onCancel` callback is wired (defaults to disabled-Send when no
  cancel is wired, preserving back-compat for any other call site).
- ⌘+. (period) keyboard shortcut added to App.tsx's existing hotkey
  block — macOS canonical "abort current foreground action" gesture
  (mirrors Finder / Xcode / many native apps).
- Two new i18n keys (`composer.cancel`, `composer.cancelTitle`) +
  one toast key (`toast.requestCancelled`) in both `tr.ts` and
  `en.ts`. Cancel-button title surfaces the keyboard shortcut.
- 5 new vitest covering `makeAbortError` shape, already-aborted
  signal propagation, mid-flight abort propagation, signal forwarded
  to `fetch` RequestInit, and back-compat for callers without a
  signal. Frontend total **267 → 272**.

**Acceptance hits — partial:**

- ✅ Click Cancel or hit ⌘+. → red button reverts to Send, "İstek
  iptal edildi" / "Request cancelled" toast appears.
- ✅ Fetch path (`bridge.available === false`, e.g. dev mode without
  zero-native): real cancellation via browser-native AbortSignal —
  underlying request actually terminated.
- ⚠️ Native path (`bridge.available === true`, normal app): SOFT
  cancel only. UI returns to ready immediately; the curl subprocess
  keeps running until natural completion (timeout or success). The
  next `bridge.invoke('http.request', ...)` queues behind the
  still-running curl, so a new request after Cancel can lag up to
  the request's `timeout_ms` (default 60s). See Follow-ups.

## Follow-ups

Items 4 and 5 deferred — both blocked on a zero-native bridge
architectural change. The current zero-native dispatcher (see
`~/Herd/zero-native/src/bridge/root.zig:159` and
`platform/macos/appkit_host.m:139`) calls handler `invoke_fn`
synchronously on the WKWebView main thread, so a separate
`http.cancel` IPC call can't dispatch a SIGTERM while the
in-flight `http.request` is blocked in `std.process.run`.
Two follow-up files queued:

- `docs/backlog/P2-…-async-bridge-handler-migration-for-cancel-progress.md`
  — Migrates `http.request` to the existing-but-unwired
  `AsyncHandler` API in zero-native (`bridge/root.zig:108`).
  Prerequisite for both #4 and #5. Touches the zero-native
  dispatcher to actually route async commands.
- `docs/backlog/P3-…-http-progress-events-design.md`
  — Designs the bridge protocol for progress events (curl
  `--progress-bar` parsing on Zig side, ReadableStream on fetch
  side, event-emit shape over the bridge). Builds on the async
  bridge migration above.
