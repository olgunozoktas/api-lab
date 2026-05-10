---
title: Examples — save responses as fixtures
group: Composer
order: 2
---

Examples are saved snapshots of a response, attached to a saved
request. They're useful for:

- Documenting "this is what success looks like" alongside the
  request.
- Comparing today's response to yesterday's.
- Feeding the (forthcoming) Zig sidecar mock server.

## Saving an example

1. Send a request.
2. In the response pane, switch to the **Examples** sub-tab.
3. Click **Örnek olarak kaydet / Save as example**.
4. Give it a name (e.g. "happy path", "rate limited 429").

The example persists with the saved request. Reload the app — it's
still there.

## Limitation

Examples live on **saved** requests only. If the request hasn't been
saved into a collection yet (`⌘ S`), examples save into the active
tab's working state but won't survive a reload. Save the request
first, then add examples.

## What you can do with examples (now and soon)

- **Now:** view, rename, delete from the Examples panel.
- **Soon (backlog):** a built-in mock server (Zig sidecar) that
  serves saved examples over HTTP for offline development.
