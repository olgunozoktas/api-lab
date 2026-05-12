---
title: Saved-request rows now have "Copy URL" and "Copy as cURL" too
date: 2026-05-12
---

Right-click any saved request in the sidebar — the context menu
gains the same **Copy URL** and **Copy as cURL** actions that
landed for history rows in v0.2.18. Same builder pipeline:
env-substituted URL, auth folded into headers, body attached
(skipped for GET/HEAD), content-type set.

Quick way to share a reproducer for one of your saved requests
without loading it into the active tab or going through the
response head's Copy-as menu.
