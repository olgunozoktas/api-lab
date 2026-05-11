---
title: Tabs auto-name themselves from the URL
date: 2026-05-11
---

When a new tab still has its placeholder name ("Yeni istek" / "New
request"), the tab strip now shows a label derived from the URL
instead — e.g. `GET api.github.com/users/octocat` rather than three
indistinguishable "Yeni istek" tabs.

The display name is purely visual; the stored tab name is unchanged.
The moment you double-click and rename a tab (or open one from a
saved collection), your name wins — the auto-derived label only
fills in for tabs you haven't named yet.

Schemes (`http://`, `https://`, `wss://`, …) are stripped and long
URLs are truncated with an ellipsis so the strip stays readable when
several tabs are open.
