---
title: Cookie jar — auto-capture and replay
date: 2026-05-21
---

API Lab now ships a real **cookie jar**. Hit a login endpoint, the
returned `Set-Cookie` header is captured into the jar, and every
subsequent request to that domain automatically carries the cookie
— no more copying `Set-Cookie` values into a header by hand.

**What captures:** every `Set-Cookie` response header from a request
sent via the native bridge. The browser-mode fallback (running
under `dnpm run dev` directly) uses the browser's own cookie jar
instead.

**Domain + path matching** follows the relevant slice of RFC 6265:
`example.com` matches `example.com`, `api.example.com`, and
`a.b.example.com`, but NOT `notexample.com`. Path cookies match
their prefix at a real `/` boundary. `Secure`, `SameSite`, and
expiry attributes are honored as v1 cuts (queued as follow-ups).

**TopBar → cookie icon** opens the jar — filter by domain / name /
path, audit what's stored, delete individual entries, or clear the
whole jar. Add / edit will land in a v1.1 once a real "seed
without a login" need surfaces.

**Manual `Cookie:` headers still win.** Set one in the Headers tab
and the jar skips replay for that request, so the server never
sees two `Cookie` headers. Replay is also bypassed under proxies
like Charles when you want a "no jar" trace — just drop a single
empty `Cookie:` header to opt out per request.
