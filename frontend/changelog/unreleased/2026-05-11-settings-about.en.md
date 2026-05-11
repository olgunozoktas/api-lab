---
title: Settings: new "About" section with version + quick links
date: 2026-05-11
---

The Settings modal gained an **About** section at the bottom:

- App name + version (v0.1.0, from `package.json`).
- One-line tagline explaining what API Lab is.
- A small key/value list — Platform, Native shell, Frontend, Storage —
  so the stack underneath isn't a black box.
- Three quick-link buttons: **Guides**, **Changelog**, **GitHub repo**.
  Guides + Changelog dispatch window events so Settings closes
  cleanly before the next modal mounts (no double-dialog flash).

Also: the **Keyboard shortcuts** section gained the three previously-
missing entries (`⌘ B` toggle sidebar, `⌘ .` cancel request, `?` open
Guide hub) so the in-Settings reference matches the dedicated guide
page.
