---
title: Binary body panel now shows the picked file's size
date: 2026-05-21
---

Pick a file in the **Binary** body panel and the row now reads
`<filename> · <content-type> · <size>`. Previously you had to swap
to Finder to check whether you were about to upload the right file.

Powered by a new read-only `fs.stat` native bridge command that the
panel queries on path change. The bridge is gated to the
`filesystem` permission, returns `{exists, size}` only (no read /
write / delete capability), and silently no-ops outside zero-native
so browser-mode dev still works.
