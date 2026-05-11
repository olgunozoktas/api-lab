---
title: Download response body to a file
date: 2026-05-11
---

The response head bar (above the body view) gained a **Download**
button next to **Copy body**. Click it to save the response body to a
file — filename is auto-derived from the response status code and
Content-Type extension (`response-200.json`, `response-404.html`,
`response-500.txt`, etc).

Useful for:

- Pulling down a config / data export JSON for offline inspection
- Capturing error pages for bug reports
- Stashing snapshots before a destructive endpoint flips state

The Blob is created in-browser (no native bridge round-trip) so the
download is instant and works regardless of HTTP transport mode.
