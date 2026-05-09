# Phase M.2 — Encrypted cloud sync (BYO storage)

Priority: P2

## Context

Solo devs want sync across 3 machines without a SaaS account. Cloud sync via the user's own S3 / Cloudflare R2 / iCloud Drive — encrypted client-side, key never leaves the device. The storage provider sees only ciphertext + metadata sizes.

Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Security lens § 4.

## Items

- [ ] Storage adapter abstraction: `lib/sync/storage.ts` with `S3Adapter`, `R2Adapter`, `IcloudAdapter` (just a folder path), `HttpAdapter` (PUT/GET to arbitrary URL)
- [ ] Encryption: libsodium secretbox per file; AEAD with authenticated payload + nonce
- [ ] Key derivation: Argon2id from a user passphrase; passphrase prompt on app start (cached in macOS Keychain after first unlock)
- [ ] Sync loop: on workspace change, encrypt + upload changed files (debounced); on app start, fetch + decrypt + apply
- [ ] Last-writer-wins with manual conflict UI (same as M.1's git conflict view)

## Acceptance

User configures S3 bucket creds → makes change on machine A → opens app on machine B (same passphrase) → change appears within 30 seconds. Storage provider's S3 console shows only ciphertext.

## Tradeoffs

libsodium adds ~80 KB. Argon2id is intentionally slow (1-2s) — only on first unlock per session.

## How to work on this

1. Phase M.1 (Git sync) first — its serializer is the input to encryption.
2. `libsodium-wrappers` (npm) is the easiest libsodium binding.
