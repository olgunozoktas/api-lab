---
title: Tab strip's "+" and close buttons show their shortcuts on hover
date: 2026-05-14
---

The tab strip's **"+" new-tab** button and the per-tab **× close** button
now display their keyboard shortcuts (`⌘T` and `⌘W`) in the hover
tooltip. Both shortcuts have worked since v0.2.x; this slice surfaces
them where you'd reach for them.

Unlike Send / Cancel / Settings (which use inline `<KbdHint>` chips
because the buttons have visible label text), the tab strip buttons
are icon-only — adding a chip would clutter the strip. Tooltip suffix
is the correct pattern for icon-only buttons and keeps the shortcut
discoverable for keyboard-curious users without changing the visual.

Under the hood, the `TabStrip` leaf component gained two new optional
props (`newTabShortcut`, `closeTabShortcut`) so the shortcut string
flows in from the container — the leaf stays portable to apps that
bind different shortcuts.
