---
title: Copy as code — redact-secrets toggle
date: 2026-05-21
---

The **Copy as code** dropdown gains a *Redact secrets* checkbox at
the bottom. Toggle it on before picking a language and credential
headers + sensitive JSON-body fields ship as `<REDACTED>` in every
generator (cURL, fetch, axios, Python `requests`, Go `net/http`,
Node `https`). Default is off so the snippet stays runnable; the
choice persists across launches.

What's redacted:

- Headers (case-insensitive name match):
  `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`,
  `X-Api-Key`, `X-Auth-Token`.
- JSON-body string fields keyed `token`, `api_key`, `secret`,
  `password` (case-insensitive). Non-JSON bodies (form-encoded,
  XML, multipart, raw binary) pass through untouched — a regex pass
  over arbitrary strings would corrupt the snippet, so we leave it
  visible and trust you to scrub by hand for those.

A one-line hint reads "Secrets redacted — generated code will not
run as-is." under the toggle when it's on, so you don't paste the
redacted snippet and wonder why it 401s.
