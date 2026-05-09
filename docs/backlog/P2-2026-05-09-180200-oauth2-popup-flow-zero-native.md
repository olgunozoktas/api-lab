# OAuth 2.0 popup flow (auth code + PKCE) — zero-native upstream

Priority: P2

## Context

Phase G.1 ship (`feat/oauth-helper`, 2026-05-09) covered the helper variant:
manual access_token paste + auto-Bearer injection + Refresh button via the
existing curl bridge. PKCE generators (`lib/oauth.ts`) are wired and tested
(19 unit tests) but UNUSED — there's no popup window to drive the auth-code
flow against, and we have nowhere to safely store the resulting tokens.

This file tracks the **automated popup flow** that completes the OAuth 2.0
story. It needs zero-native upstream changes (the api-lab side is small).

## Items

- [ ] zero-native: new bridge command `oauth.popup({auth_url, redirect_uri_pattern}) -> Promise<{code, state}>`
  - Opens a separate WKWebView window pointed at `auth_url`
  - The popup runs in an isolated process (separate WKWebView, no opener access) — phishing/token-leak protection
  - Native side intercepts navigation; when the URL matches `redirect_uri_pattern`, captures `code` + `state` from the URL fragment / query, closes the popup, resolves the JS Promise
  - Strict pattern matching — anything that doesn't match the expected redirect closes the popup with an error
- [ ] zero-native: new `keychain.write(service, account, secret)` and `keychain.read(service, account)` and `keychain.delete(service, account)` bridge commands wrapping macOS `Security.framework` (`SecItemAdd` / `SecItemCopyMatching` / `SecItemDelete`)
- [ ] api-lab: AuthPanel "Get token" button that drives the full PKCE flow
  - Generate code_verifier + code_challenge via `lib/oauth.ts:generateCodeVerifier` + `deriveCodeChallenge` (already shipped)
  - Build the auth URL with state nonce + PKCE challenge
  - Call `oauth.popup` bridge → on resolve, exchange code via existing curl bridge (using `tokenExchangeBody` already shipped)
  - Save tokens via `keychain.write` (so they don't sit in IndexedDB plaintext)
  - Update Auth.oauth2 with the new tokens; AuthPanel renders the same way
- [ ] Provider presets (Google, GitHub, Atlassian, Microsoft) — pre-fill auth_url + token_url + scope defaults

## Acceptance

User pastes Google Cloud OAuth client_id, hits "Get token" → Google consent screen opens in a popup → approves → returns to the app with a working access_token → fires `GET https://www.googleapis.com/oauth2/v3/userinfo` successfully. No copy-paste of code or token by hand.

## Tradeoffs

Each provider has quirks (Google's localhost:port redirect, Atlassian's audience param, Microsoft's tenant-aware endpoints). Ship the generic flow first; build presets after the first 3 user reports.

## How to work on this

1. Pre-req: zero-native PR for `oauth.popup` + `keychain.*` commands.
2. api-lab side mostly already exists — `lib/oauth.ts` has PKCE + token exchange utilities; AuthPanel just gets a "Get token" button + provider preset dropdown.
3. Tests: e2e against a known OAuth playground (e.g. https://www.oauth.com/playground/).
