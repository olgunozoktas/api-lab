# macOS Keychain bridge + secrets vault

Priority: P2

## Context

OAuth 2.0 (helper variant) shipped 2026-05-09 stores access_token + refresh_token in IndexedDB-persisted state. That's plaintext-on-disk under `~/Library/WebKit/API Lab/WebsiteData/IndexedDB/`. Acceptable for v1 helper but becomes a real footgun once:

- The full popup flow lands (`P2 #180200`) — every API Lab user will have OAuth tokens for multiple providers in IDB.
- Phase H (pre/post scripts) ships — scripts can read the persisted state and exfiltrate tokens.
- Phase M (cloud sync) ships — tokens would sync to the user's S3 / iCloud, which is a wider attack surface than local-only.

Solution: macOS Keychain via `Security.framework`. Tokens never sit on disk in plaintext; OAuth Refresh / Bearer injection reads them at request time via a bridge command.

Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Eng lens § 7.

## Items

- [ ] zero-native: new bridge commands
  - `keychain.write({service, account, secret}) -> {ok}` — wraps `SecItemAdd` (kSecClassGenericPassword)
  - `keychain.read({service, account}) -> {secret} | {error}` — wraps `SecItemCopyMatching`
  - `keychain.delete({service, account}) -> {ok}` — wraps `SecItemDelete`
  - All scoped to the app's bundle id (Apple's default — apps can't read each other's keychain entries)
- [ ] api-lab: new `lib/secrets.ts` with `setSecret(key, value)` / `getSecret(key)` / `deleteSecret(key)` wrappers
- [ ] Migrate OAuth 2.0 token storage: instead of putting `access_token` / `refresh_token` in `Auth.oauth2`, persist a stable secret-id; tokens live in Keychain keyed by that id
- [ ] AuthPanel UI never echoes the actual secret back; shows "set" / "not set" indicators
- [ ] On macOS Keychain access prompt (first read after relaunch), show a clear UI explaining what API Lab is asking for

## Acceptance

After a fresh launch + relaunch, the OAuth `access_token` is still usable (read from Keychain), but `localStorage.getItem(...)` / IDB inspection shows no token strings. Wiping the WebKit data dir does NOT remove the tokens (they're in `~/Library/Keychains/`).

## Tradeoffs

- macOS-only for v1. Linux/Windows equivalents (libsecret / DPAPI) deferred until cross-platform Phase N.
- Keychain access prompts can feel intrusive on first use; mitigate with a one-time explainer in the AuthPanel.
- Apple Developer Program signing makes the keychain prompt friendlier ("API Lab wants to access keychain item") vs. the un-notarized "code identity unverified" dance.

## How to work on this

1. Pre-req: zero-native PR for `keychain.*` commands. macOS `Security.framework` ObjC bindings via Zig FFI.
2. api-lab side: `lib/secrets.ts` is ~30 LOC of bridge calls.
3. Migration: existing IDB entries stay until we explicitly migrate; on first OAuth refresh, write to Keychain + clear from IDB.
4. Pair with `P2 #180200` — these two slices are entangled and could ship together.
