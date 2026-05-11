---
title: Right-click any tab → Close · Duplicate · Close others · Close to right
date: 2026-05-11
---

The tab strip above the composer gained a browser-style right-click
context menu with four entries:

- **Close tab** — same as the ✕ on hover or middle-click.
- **Duplicate tab** — clone the request (URL, method, headers, body,
  auth, scripts) into a fresh tab right after the source; the
  duplicate becomes active. Handy for "try this same request with
  one header tweaked" workflows.
- **Close other tabs** — collapse the strip down to just the
  right-clicked one. Disabled when only one tab is open.
- **Close tabs to the right** — drop everything after the anchor.
  Disabled on the rightmost tab.

Live edits in the active tab are snapshotted into the duplicate /
kept tab before the close, so unsaved changes aren't lost when you
close everything around the tab you want to keep.
