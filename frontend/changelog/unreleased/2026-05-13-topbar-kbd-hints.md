---
title: TopBar Settings and Environments buttons now show their shortcuts inline
date: 2026-05-13
---

The TopBar's **Settings** and **Edit environments** buttons now display
their keyboard shortcuts inline (`⌘ ,` and `⌘ ⇧ E` respectively),
matching the `⌘ ↵` hint on Send and the new `⌘ .` hint on Cancel.

The shortcuts themselves have worked since v0.2.21 / v0.2.22 — this
slice just brings the TopBar into the same visual language as the
composer buttons, so every commonly-used action surfaces its
shortcut where you'd look for it.

The `KbdHint` primitive also moved from `components/UrlBar.tsx` into
its own home at `components/ui/kbd-hint.tsx` so future buttons can
adopt the pattern without a sibling-component import. Existing
imports continue to work via re-export.
