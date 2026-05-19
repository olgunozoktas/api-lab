---
title: Saved-request responses survive a relaunch
date: 2026-05-19
---

The per-request response memory now persists. Re-open API Lab, click a
saved request, and the response it last returned is still there —
status, headers, body, timings — instead of an empty panel.

The cache is bounded so it can't bloat your stored data: a single
oversized response (near the 1 MB bridge cap) is never cached, the
whole cache stays under a fixed byte budget with the oldest evicted
first, and responses older than two weeks are dropped on launch.
