---
title: The fatal-error banner can now be dismissed
date: 2026-05-15
---

The red fatal-error banner that appears at the top of the window
on an uncaught crash now has a **×** close button.

Many of the errors it surfaces — async failures, unhandled promise
rejections, bridge dispatch hiccups — leave the rest of the app
perfectly usable. Previously the banner stayed pinned to the top of
the window with no way to clear it. Now you can dismiss it and keep
working; if a fresh error fires, the banner reappears.
