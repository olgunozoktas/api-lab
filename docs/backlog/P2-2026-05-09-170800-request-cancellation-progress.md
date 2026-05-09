# Phase E.2 — Request cancellation + progress

Priority: P2

## Context

Today the Send button is a footgun on big requests — once fired,
no way to abort except waiting for timeout. Real-world API testing
hits APIs that occasionally hang for 30s+. Need a cancel.

Also: progress for streaming downloads (large response, file
upload) — Postman has this, we don't.

## Items

- [ ] Send button morphs to red "Cancel" while in-flight (busy state already exists in App.tsx onSend)
- [ ] ⌘+. (period) keyboard shortcut to cancel current request
- [ ] AbortController for the fetch path: pass `signal` through `lib/sendRequest.ts:viaFetch`
- [ ] Native curl path: extend the bridge handler to track in-flight subprocess PIDs; new bridge command `http.cancel({requestId})` sends SIGTERM
- [ ] Optional progress callback: `onProgress({sent, received, total?})` — surface as a thin progress bar under the URL bar
- [ ] Toast on cancel: "Request cancelled"

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
