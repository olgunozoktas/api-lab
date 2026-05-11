---
title: Body panel: explain what each mode sends on the wire
date: 2026-05-12
---

Same treatment the Auth panel got — the request **Body** panel now
shows a small one-line hint directly under the mode dropdown
describing what the selected mode produces on the wire:

- **None** — no body, no `Content-Type`. Use for GET / HEAD.
- **JSON** — body with `Content-Type: application/json`, Pretty
  Format reformats, `{{var}}` references substitute at request time.
- **x-www-form-urlencoded** — `key1=value1&key2=value2` shape with
  the matching content type, mimicking HTML form posts.
- **Raw** — body sent as-is; set the `Content-Type` header yourself
  for XML / plain text / custom formats.

The hint is sibling to the existing Auth-mode hint, so both
composer tabs feel consistent.
