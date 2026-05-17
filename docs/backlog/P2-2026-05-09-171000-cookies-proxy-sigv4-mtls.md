# [PAUSED] Phase G.2 — Cookie jar UI + proxy + AWS SigV4 + mTLS

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
- [x] Proxy config in Settings: HTTP / HTTPS / SOCKS5, bypass list, applied via curl's `--proxy`
- [x] AWS Signature v4: pure-JS implementation (~80 LOC, no deps) — `auth.type = "aws-sigv4"` with access_key, secret_key, region, service fields
- [x] mTLS: client cert + key + passphrase fields per env; bridge passes to curl via `--cert` / `--key`
- [ ] Tests: SigV4 against AWS docs canonical examples; cookie jar matching against URL patterns

## Progress (2026-05-17) — proxy + SigV4 + mTLS shipped; cookie jar PAUSED

Three of the four features shipped + merged: outbound **proxy**
(Settings → curl `--proxy`), **AWS SigV4** (`auth.type = "aws-sigv4"`,
a dependency-free Web Crypto signer in `frontend/src/lib/awsSigv4.ts`),
and **mTLS** (`auth.type = "mtls"`, curl `--cert`/`--key`/`--pass`).
SigV4 + `buildArgv` proxy/mTLS tests landed.

The **cookie jar** (items 1-3, plus the cookie half of item 7) is a
self-contained subsystem — a store slice, a jar UI, URL-pattern
matching, Set-Cookie extraction — and was carved into its own file
rather than rushed into this multi-feature ship:

  `docs/backlog/P2-2026-05-17-...-cookie-jar.md`

That follow-up file is the live tracker for the cookie work. This
parent is prefixed `[PAUSED]` so `/backlog-next` skips it; items 1-3
+ 7 stay unchecked here (genuinely not done) but are tracked there.
Close this file once the cookie-jar follow-up lands.

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
