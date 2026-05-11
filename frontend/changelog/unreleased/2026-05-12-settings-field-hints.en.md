---
title: Settings → Request defaults: per-field explanations
date: 2026-05-12
---

Each field under **Settings → Request defaults** now shows a small
one-line hint underneath the input:

- **Timeout (ms)** — how long to wait for a response before the
  request fails (default 60000 = 1 minute).
- **Max redirects** — max hops in a 3xx chain; `0` disables
  auto-follow entirely.
- **Skip TLS verification** — equivalent to curl's `-k`; useful for
  self-signed dev APIs, never use against production.

Same pattern the composer-tab hints follow — keep the explanation
right next to the control so you don't have to leave the modal to
figure out what each setting does.
