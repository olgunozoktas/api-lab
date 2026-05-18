---
title: Visualize now handles envelope-wrapped JSON responses
date: 2026-05-18
---

The Visualize tab used to only recognize a JSON response that was a
**top-level array**. Most real APIs wrap their list in an object —
`{"data": [...]}`, `{"results": [...]}`, JSON:API, pagination
envelopes — and for all of those Visualize said "not visualizable".

It now looks one level in: when the response is an object, Visualize
finds the array property and charts that. Known wrapper keys (`data`,
`results`, `items`, `rows`, `records`, `list`) are preferred; with no
known key, the longest array wins. A small **`showing data[]`** badge
tells you which property was unwrapped, so you know the table isn't
the whole response.
