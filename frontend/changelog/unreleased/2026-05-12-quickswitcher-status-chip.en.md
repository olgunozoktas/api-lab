---
title: Quick switcher history hits now use the colored status chip
date: 2026-05-12
---

When ⌘+K / ⌘+P pulls up history results, the status code on the
right side of each row used to be plain muted text. It now uses
the same class-coloured chip the response header and the history
sidebar use — green 2xx, orange 4xx, red 5xx — so you can spot the
status of past calls without parsing the digit. Hover the chip for
the full status text.

Tab and collection results keep the URL on the right; only history
hits get the chip, because that's where the status is the relevant
extra info.
