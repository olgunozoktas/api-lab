---
title: URL bar shows what `{{var}}` references resolve to
date: 2026-05-11
---

When your URL contains `{{baseUrl}}/users` or similar placeholders, a
faded preview line now appears below the URL input showing the
resolved value (`→ https://api.test/users`) against the active
environment. No more "wait, what does `{{baseUrl}}` point to right
now?" before hitting Send — the answer is right there.

The preview hides itself entirely on plain URLs (no `{{` anywhere)
and when substitution produces the same string. Cheap path: a single
regex check skips the env walk completely when there's no placeholder
in the URL.
