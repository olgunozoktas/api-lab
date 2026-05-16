---
title: Hex viewer and XML tree view for responses
date: 2026-05-15
---

The response Body tab now renders two more content types instead of
dropping to raw text:

- **XML** — `application/xml`, `text/xml`, and any `+xml` type get a
  collapsible tree view. Element names, attributes, and leaf text
  are colour-coded; deep documents start collapsed past four levels.
  A malformed document is flagged rather than shown as a blank tree.
- **Binary** — `application/octet-stream` and other binary payloads
  get a classic `hexdump -C` grid: offset, hex bytes in two groups
  of eight, and an ASCII gutter. Large bodies are capped at the
  first 16 KB.

These join the existing JSON, HTML, and SVG viewers. Image, audio,
video, PDF, and response-diff viewers are still to come — they need
the response pipeline to carry raw binary bytes, which is tracked
as a follow-up.
