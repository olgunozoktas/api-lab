# gRPC TLS — pre-flight PEM validation + cert inspection card

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-154501-grpc-tls-mtls-cacert-cert-key.md`
(shipped 2026-05-09). The Step 8 CEO pass flagged this as a 10-star
polish on the freshly-shipped TLS slice.

Today: paste a malformed PEM, hit Send, wait for the slow grpcurl
round-trip, see a generic transport error stuffed into the response
panel. Diagnosing "is my CA cert wrong, my client cert expired, or my
server name not matching" is per-call trial-and-error.

The 10-star UX is **pre-flight feedback**:

1. **Format validation** — visual indicator on each CodeEditor tab as
   the user pastes: green check for "well-formed PEM" (BEGIN/END markers
   present, base64 parses, X.509 ASN.1 structure valid), red dot for
   garbage.
2. **Cert inspection card** — for parsed certs, surface a small read-only
   panel below each PEM editor with: subject CN, issuer CN, NotBefore /
   NotAfter (with red color when expired or expiring within 7 days),
   Subject Alternative Names (matters for `-servername` correctness).
3. **Mismatch hints** — if the user's `target` URL is `api.example.com`
   and the cert SANs don't include `api.example.com` (and `serverName`
   is empty), surface a yellow "this server cert may not match the
   target" hint.

Implementation options:

- **A. In-browser X.509 parsing** — there's no native `WebCrypto.parseX509`
  but libraries like `node-forge` or `pkijs` can parse PEMs in JS. ~50KB
  bundle hit. Pure-frontend, no bridge needed.
- **B. Bridge subprocess to `openssl x509 -text -noout`** — same shell-out
  pattern as the curl/grpcurl bridges. Requires `openssl` on PATH (almost
  universal on macOS) and a new bridge command.

Lean toward A for offline-friendliness and to avoid the bridge round-trip
during typing.

## Items

- [ ] Pick a PEM/X.509 parsing library (forge, pkijs, jsrsasign) and
      benchmark bundle size + cold-parse perf for a 2KB cert.
- [ ] Add `lib/x509.ts` with a pure helper:
      `inspectPem(pem: string): { ok: boolean, error?: string, subject?: string, issuer?: string, notBefore?: Date, notAfter?: Date, sans?: string[] }`.
- [ ] Add a compact `<CertInspectorCard>` component below each of the
      three PEM CodeEditors. Hides when input is empty.
- [ ] Add an "expiring soon" / "expired" badge with red color when
      `notAfter < now + 7d`.
- [ ] Add SAN-mismatch hint when target host doesn't match.
- [ ] Tests for `inspectPem` — happy path (parses self-signed test cert),
      bad input (returns `ok: false` with message), expired-cert
      detection, SAN extraction.

## Acceptance

Paste a PEM into the CA cert editor. Within ~50ms a small card appears
showing "Subject: CN=test-ca.local — Expires 2027-05-09 (in 730 days)".
Paste garbage → red dot + "Not a valid PEM block" message. Paste a cert
expired yesterday → red "Expired 1 day ago" badge.

## Tradeoffs

Bundle size: forge is ~150KB minified, pkijs ~80KB. Both significant
but acceptable for a desktop tool. jsrsasign ~250KB — too big.

Alternative: defer parsing until first paste (lazy import via dynamic
`import()`), so users who never use TLS don't pay the cost. Vite +
React handle this cleanly.

## How to work on this

1. Read the current TLS tab in `frontend/src/components/GrpcPanel.tsx`
   for the layout to slot the inspector card under each editor.
2. Generate a self-signed cert pair locally for testing:
   `openssl req -newkey rsa:2048 -nodes -keyout /tmp/k.pem -x509
   -days 365 -subj "/CN=test.local" -addext "subjectAltName=DNS:test.local"
   -out /tmp/c.pem`.
3. The card design should reuse `<Info>` icon styling from existing
   gRPC hints; red color = `var(--color-error)` token.
4. Don't block Send when validation fails — user might paste a key whose
   format we can't parse but is still valid input to grpcurl.
