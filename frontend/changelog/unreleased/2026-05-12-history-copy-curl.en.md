---
title: History context menu now includes "Copy as cURL"
date: 2026-05-12
---

Right-click any history row → **Copy as cURL** to get the
full wire-level curl command for that past request copied to the
clipboard. The same builder the live composer's Copy-as menu uses
runs over the historical snapshot: env vars are substituted with
the currently-active environment, auth headers are folded in, and
the body is attached (skipped for GET/HEAD).

Useful for sharing a reproducer of a request from history without
having to re-load the tab + open the Copy-as menu.
