---
title: Transport indicator is now a labeled chip
date: 2026-05-12
---

The bare "native" / "fetch" word in the response header is now a
small chip with an icon — terminal for native (request went through
the Zig curl subprocess, CORS-free, real headers) and globe for
fetch (browser fallback, CORS rules apply). Native chip keeps the
success-green colour signal.

Hover the chip to see why the distinction matters — the tooltip
spells out which path the response travelled and what that means
for headers + CORS.
