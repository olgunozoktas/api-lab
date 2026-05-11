---
title: Tab strip scrolls horizontally when many tabs are open
date: 2026-05-11
---

The tab strip used to shrink each tab uniformly when many were open,
collapsing every tab down to just `GET ✕` with no readable label.
Tabs now keep their minimum readable width (`140px`) and the strip
scrolls horizontally when they overflow — same behavior as Safari,
Chrome, Cursor.

A small bonus: switching to a tab (click, `⌘1..9`, quick switcher)
auto-scrolls it into view, so a newly-created or off-screen tab can't
hide from you.
