---
title: Auth panel: explain what each auth mode does on the wire
date: 2026-05-12
---

Picking an Auth type used to dump a row of inputs in front of you
with no context. The panel now shows a small one-line hint directly
under the type dropdown describing what the selected mode produces
on the wire — `Bearer` → `Authorization: Bearer <token>`, `Basic` →
base64 of `user:pass`, `API Key` → the header name + value you pick,
`OAuth 2.0` → grant flow + cached `Bearer` + auto-refresh.

No more guessing whether your value goes in a header, a body, or
nowhere visible.
