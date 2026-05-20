---
title: Loading states for import + streaming panels
date: 2026-05-20
---

A handful of "is it doing anything?" gaps closed:

- **Import** — the sidebar's *Import* button now shows a spinner and
  "Importing…" label while a collection / spec / HAR / Bruno file is
  parsing, so a big OpenAPI doc doesn't look frozen.
- **gRPC / SSE / WebSocket panels** — each status pill picks up a
  small spinner glyph while the call is **running** or the stream is
  **connecting**.

Every indicator runs through the shared delay-show hook, so a fast
operation (a localhost gRPC unary, a sub-100 ms file parse) never
flashes a placeholder onto the screen.
