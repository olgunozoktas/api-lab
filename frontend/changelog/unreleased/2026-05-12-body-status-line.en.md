---
title: Body editor now shows a live byte count and JSON-validity chip
date: 2026-05-12
---

A small footer line under the request body editor now reads the
encoded byte size (colored with the same size-band palette the
response uses — muted under 100 KB, orange to 1 MB, red beyond)
plus a JSON-validity chip when **Body mode = JSON**: green
**Valid JSON** with a check icon when the text parses, orange
**Invalid JSON · &lt;message&gt;** with a warning triangle when it
doesn't. Hover the invalid chip for the full parse error.

The footer is hidden when the body is empty so the None-mode panel
stays clean. Catches "I forgot a comma" before you hit Send,
without having to click the Pretty format button.
