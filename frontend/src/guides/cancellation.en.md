---
title: Request cancellation — abort in-flight calls
group: Composer
order: 1
---

While a request is in flight, the **Gönder / Send** button morphs
into a red **X İptal / Cancel** button. Click it — or press the
canonical macOS abort gesture **`⌘ + .`** — and the request aborts
immediately. The UI returns to ready state and a toast confirms.

## Under the hood

For HTTP requests using the WebKit fetch path, an `AbortSignal` is
threaded through to `fetch()`. The native socket actually closes; no
data continues flowing.

For requests routed through the native bridge (curl subprocess), the
JavaScript side aborts immediately but the curl process keeps
running until it completes naturally. This is documented limitation;
the next bridge command queues behind the still-running curl up to
the configured timeout.

## When it's helpful

- Long-running responses that will time out anyway.
- Accidentally sent the wrong endpoint and the response is taking
  forever.
- Mid-debug, you realize the request body is wrong — abort + edit +
  resend instead of waiting for completion.

## What it does NOT do

- Cancel WebSocket / SSE connections — those have their own
  **Disconnect** controls in their respective tabs.
- Cancel concurrent requests in other tabs — each tab carries its
  own cancellation state.
