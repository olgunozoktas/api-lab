---
title: Tab strip scrollbar is invisible (still scrolls)
date: 2026-05-11
---

The horizontal scrollbar that appeared under the tab strip when many
tabs were open is now hidden. The strip still scrolls — trackpad
swipe, mouse wheel with shift, or middle-click drag all work — but
the visible 10px bar no longer eats vertical space or competes with
the tab row's clean line. Matches the native Safari / Chrome tab-strip
look.

Two new global utility classes ship alongside (`.scrollbar-none`,
`.scrollbar-thin`) for future use on other compact strips. The default
10px scrollbar elsewhere in the app is unchanged.
