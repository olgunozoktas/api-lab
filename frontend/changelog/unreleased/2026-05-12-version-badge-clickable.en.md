---
title: Version badge in the top bar is now clickable
date: 2026-05-12
---

The `vX.Y.Z` chip next to "API Lab" in the top bar used to be
purely a tooltip-on-hover label. Click it now and it opens the
changelog modal directly — same modal that auto-opens once after
a fresh upgrade. The tooltip still shows the version + build date;
the new hint line tells you the chip is clickable, and keyboard
focus + Enter works too.

Closes the gap between "I see a new version landed" and "show me
what changed" — one click instead of three (Settings → About →
Changelog).
