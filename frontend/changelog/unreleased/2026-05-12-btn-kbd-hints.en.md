---
title: Send + Save buttons show their keyboard shortcuts inline
date: 2026-05-12
---

A small faded `⌘ ↵` chip now sits inside the **Send** button and
`⌘ S` inside **Save** — the keyboard shortcut is right where you
look when reaching for the button. Hover tooltips also gained an
explicit "(⌘+↵)" / "(⌘+S)" suffix so the shortcut is discoverable
two ways.

The chip uses the new tiny `KbdHint` helper component (exported from
UrlBar.tsx) so any future action button can pick up the same look
with one line.
