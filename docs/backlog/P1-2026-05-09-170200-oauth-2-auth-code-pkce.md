# Phase G.1 — OAuth 2.0 (auth code + PKCE) end-to-end

Priority: P1

## Context

OAuth 2.0 is the #1 missing auth method for real-world API testing.
Every modern API (Google, GitHub, Stripe, Atlassian, Microsoft Graph,
Auth0-fronted apps) requires it. Without it, API Lab is a curl
wrapper that can't replace Postman for >50% of users.

The auth code flow with PKCE is the canonical modern flow (Google's
default, the OAuth 2.1 spec mandates PKCE for public clients).
Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Phase G.1.

## Items

- [ ] New `auth.type = "oauth2"` variant in `frontend/src/lib/types.ts:Auth`
- [ ] OAuth panel sub-component in `frontend/src/components/AuthPanel.tsx` with fields: client_id, auth_url, token_url, redirect_uri, scope, state (auto-generated PKCE code_verifier + challenge)
- [ ] "Get token" button: opens auth_url in a separate WKWebView (new bridge command `oauth.popup(url, redirect_pattern)` in `src/main.zig`)
- [ ] Native side captures the redirect URI hit, parses code from query, returns to JS via deferred-promise pattern
- [ ] Token exchange POST to token_url with code + verifier; persist result
- [ ] Token storage: macOS Keychain via new bridge command `keychain.write(service, account, secret)` and `keychain.read(...)` — never in localStorage
- [ ] Auto-refresh: if access_token expired AND refresh_token present, refresh before sending
- [ ] Display: status (no token / expires-in / refresh-required) in the AuthPanel
- [ ] Tests: PKCE generation (verifier + challenge), token-exchange request shape

## Acceptance

A user pastes Google Cloud OAuth credentials, hits "Get token", sees
the Google consent screen in a popup, approves, returns to the app
with a working access_token, and fires `GET https://www.googleapis.com/oauth2/v3/userinfo` successfully.

## Tradeoffs

Popup needs a separate process (separate WKWebView) to keep token
interception safe. Each provider has quirks (Google requires
localhost:port redirect; Atlassian requires audience param) — ship
the generic flow first, build provider presets after the first 3
user reports.

## How to work on this

1. Read `~/Herd/zero-native/src/platform/macos/appkit_host.m` for
   the existing WebView setup; replicate for popup.
2. Read `~/Herd/zero-native/src/bridge/root.zig` for adding a new
   command type.
3. macOS Keychain via `Security.framework`: `SecItemAdd` /
   `SecItemCopyMatching`. Zig FFI to ObjC.
4. Reuse the existing curl bridge for the token-exchange POST.
