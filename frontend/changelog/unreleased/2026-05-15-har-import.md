---
title: HAR files import into History — replay captured DevTools traffic
date: 2026-05-15
---

The sidebar **Import** button now accepts **HAR 1.2 / 1.1 files** in
addition to Postman v2.1 and Insomnia v4 collections. Format is
auto-detected from the JSON shape.

HAR files (HTTP Archive) are the "Save all as HAR with content"
export from Chrome DevTools, Firefox DevTools, Charles, mitmproxy,
and Insomnia. Each entry has a real request + response + timing —
perfect material for the History pane.

**HAR populates History, not Collections.** This is deliberate:

- HAR entries have no human-given names, so they'd be unnameable
  rows in your Collections tree.
- The point of HAR is "replay something I observed"; that's the
  History pane's job.
- A 200-row Chrome capture would otherwise balloon Collections
  with disposable junk.

On a successful HAR import the sidebar auto-switches to the
**History** tab so the imported entries are immediately visible.
Click any row to load it into the active tab as you would with a
normally-recorded request; right-click for the existing context
menu (Replay / Open in new tab / Copy as cURL / Delete).

What's mapped per entry: method, URL, query string, headers, body
(JSON / urlencoded as raw / multipart skipped with warning),
response status + size + timing, and `startedDateTime` as the
history timestamp so entries land in chronological order.

12 new vitest cases bring the suite to **432 tests** (was 420).
Closes the second item of the Phase E import P2; Bruno remains
queued for a follow-up slice.
