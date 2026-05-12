---
title: Cancel button now shows the ⌘ . shortcut hint
date: 2026-05-13
---

The in-flight Cancel button now displays the `⌘ .` keyboard hint
inline, matching the `⌘ ↵` hint already shown on the Send button.

The shortcut itself has worked since v0.2.4 (the global keydown
handler in `App.tsx` already binds `⌘+.` to abort the current
request), but it was discoverable only from the Settings → Shortcuts
list. With this slice, it's surfaced exactly where you'd expect
it — on the button it actuates — so the macOS-canonical "abort
foreground action" gesture is one glance away while a request is
running.
