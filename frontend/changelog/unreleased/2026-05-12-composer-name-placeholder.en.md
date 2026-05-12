---
title: Composer request-name input previews the auto-derived save name
date: 2026-05-12
---

When the active tab still has its placeholder name ("Yeni istek" /
"New request" / "Untitled"), the request-name input at the top of
the composer now renders empty and shows the auto-derived
`METHOD shortUrl` as its placeholder — the exact label `⌘+S` will
commit to the collection. Hovering the input reveals the same
preview in the tooltip ("⌘+S will save this as `GET api.test/users`").

Typing anything overwrites the suggestion. Manually-renamed tabs
keep their value visible as before — the swap only kicks in for
defaults, so your custom names never disappear behind a placeholder.

Closes the auto-name loop: tab strip, sidebar row, composer name
input, and `⌘+S` all show / commit the same derived label now.
