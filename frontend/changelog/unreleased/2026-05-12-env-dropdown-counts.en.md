---
title: Environment dropdown shows each env's var count
date: 2026-05-12
---

The environment switcher in the top bar now shows a tiny `N vars`
badge next to each env name when you open the dropdown. Picking
between `staging` (with 2 vars) and `prod` (with 18 vars) is now
unambiguous — you can see at a glance which one's the empty stub
and which one's the real config.

Reuses the same badge styling as the Environments modal so the link
between the two surfaces is visual as well as conceptual.
