---
title: Build date in the version-badge tooltip + Settings → About
date: 2026-05-12
---

The `v0.2.1` badge in the top bar now reveals when the bundle was
built on hover — Vite injects `__BUILD_DATE__` (ISO-8601, captured at
config-load time on every build) and the badge tooltip renders it in
your locale's date/time format.

A matching **Built** row joins the platform / shell / frontend /
storage list in **Settings → About**. Helpful when comparing two
local builds or pinning down "is this the binary I just made?".
