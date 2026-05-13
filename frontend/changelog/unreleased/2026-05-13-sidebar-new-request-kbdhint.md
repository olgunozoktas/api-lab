---
title: Sidebar's "New Request" button shows the ⌘ N shortcut hint
date: 2026-05-13
---

The sidebar's **New Request** button now displays the `⌘ N` shortcut
hint inline and exposes the shortcut in its hover tooltip too. The
shortcut has been wired since v0.1, but until now it was discoverable
only from Settings → Shortcuts; now it's right where you'd expect to
see it — on the action it triggers.

Continues the visual-language sweep that brought hints to Send (`⌘ ↵`),
Cancel (`⌘ .` — v0.2.27), Save (`⌘ S`), and the TopBar Settings /
Edit-environments buttons (`⌘ ,` / `⌘ ⇧ E` — v0.2.28). Every
frequently-used action surfaces its shortcut where you'd reach for it.

This release is also the first one with the cleaned-up arm64-only
build pipeline (Intel x86_64 hosted runners were queue-blocking
releases for hours; see Releases page on GitHub for the published
macOS arm64 tarball).
