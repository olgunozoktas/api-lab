---
title: Composer Params + Headers tabs: explainer hints
date: 2026-05-12
---

Same hint pattern the Auth + Body tabs got: the **Params** and
**Headers** composer tabs now show a small note above the KV table
explaining what each list does on the wire:

- **Params** — enabled rows are appended to the URL as
  `?key=value&key=value`. `{{var}}` references are substituted at
  request time.
- **Headers** — request headers sent verbatim. You can override
  headers Auth or Body would otherwise add (e.g. your own
  `Content-Type`). `{{var}}` supported in values.

All four composer-tab panels (Params / Headers / Auth / Body) now
have a consistent one-line "what this sends" note at the top.
