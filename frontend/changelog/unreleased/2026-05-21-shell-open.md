---
title: External links now open in your default browser
date: 2026-05-21
---

Clicking an external link (`<a target="_blank">`) — the GitHub repo
link in Settings → About, links inside rendered markdown guides /
changelog entries, gRPC docs links — now actually opens the URL in
your system default browser. Previously those clicks silently no-op'd
because the WKWebView host has no native popup-window manager.

Routing happens through a new native `shell.open` bridge that
shells `open(1)` with the URL. The Zig handler refuses anything
other than `http://` and `https://` URLs (no `file://`,
`javascript:`, `mailto:`, raw paths, etc.) so the bridge can't be
abused to launch arbitrary apps.

Modifier-key clicks (⌘+click, ⇧+click, ⌃+click) still keep their
browser-default meaning — only plain left-clicks get routed.
