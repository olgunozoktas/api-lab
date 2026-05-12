---
title: Response headers table copy buttons flash a check too
date: 2026-05-12
---

The hover-reveal copy icon next to each value in the Response →
Headers tab now uses the same Copy→Check flash that landed for the
Copy body button in v0.2.23. Each row tracks its own state, so
hitting Copy on one row doesn't visually mark every other one as
"copied".

The check sticks the button visible for ~1.2 s after click so the
confirmation registers even if your cursor has already moved off
the row — useful when you're machine-gunning copy on a header
block (Authorization, Set-Cookie, X-Request-Id, …).
