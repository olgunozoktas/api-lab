# Phase G.2 — Cookie jar UI + proxy + AWS SigV4 + mTLS

Priority: P2

## Context

The auth + network features that aren't OAuth but block real-world
testing: cookies (session-based APIs), proxies (corporate networks
+ Charles/mitmproxy debugging), AWS SigV4 (every AWS service), mTLS
(internal services with client cert auth).

Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Phase G.2.

## Items

- [ ] Cookie jar UI: list view of all cookies, scoped to URL pattern, edit/delete, persist per env
- [ ] Bridge: extend `http.request` handler to accept `cookies?: Cookie[]` and append to curl's `-b`
- [ ] Cookies extracted from `Set-Cookie` response headers → auto-add to jar (with confirm prompt for cross-origin)
- [ ] Proxy config in Settings: HTTP / HTTPS / SOCKS5, bypass list, applied via curl's `--proxy`
- [ ] AWS Signature v4: pure-JS implementation (~80 LOC, no deps) — `auth.type = "aws-sigv4"` with access_key, secret_key, region, service fields
- [ ] mTLS: client cert + key + passphrase fields per env; bridge passes to curl via `--cert` / `--key`
- [ ] Tests: SigV4 against AWS docs canonical examples; cookie jar matching against URL patterns

## Acceptance

User hits S3 GetObject with SigV4 — works. User behind a corporate
proxy can route through it. mTLS-protected internal endpoint
works with cert + key from env.

## Tradeoffs

SigV4 is fiddly (canonical request, signing key derivation) but
well-documented; vendoring is fine.

## How to work on this

1. Read `frontend/src/components/AuthPanel.tsx` for the existing
   variant pattern.
2. AWS SigV4 reference: https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html
3. Cookie jar: simplified Tough-cookie behavior (path + domain
   matching), no scope expiry edge cases v1.
