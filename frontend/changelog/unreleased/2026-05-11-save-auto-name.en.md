---
title: ⌘S on a default-named request saves with the derived name
date: 2026-05-11
---

⌘S used to save a placeholder-named request as "Yeni istek" / "New
request", so the sidebar would fill up with rows you couldn't tell
apart. It now applies the same `METHOD shortUrl` derivation the tab
strip + sidebar already display — saving `GET https://api.test/users`
lands as `GET api.test/users` in your collection, ready to rename if
you want a friendlier label.

If you've manually renamed the tab, your name still wins. If both the
name and URL are blank, the legacy `(adsız)` fallback still kicks in
(unchanged).
