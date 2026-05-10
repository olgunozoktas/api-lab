---
title: Auth — Bearer, Basic, API Key, OAuth 2.0 helper
group: Composer
order: 4
---

The **Auth** sub-tab in the composer applies authentication to the
request just before send.

## Tip / Type picker

| Type                 | Header sent                                               |
| -------------------- | --------------------------------------------------------- |
| `Yok / None`         | —                                                         |
| `Bearer Token`       | `Authorization: Bearer {{token}}`                         |
| `Basic Auth`         | `Authorization: Basic base64(user:pass)`                  |
| `API Key`            | Custom header (you pick the name)                         |
| `OAuth 2.0` (helper) | `Authorization: Bearer {{access_token}}` + Refresh button |

`{{var}}` substitution runs over every field, so a Bearer token
field of `{{access_token}}` resolves from the active environment.

## OAuth 2.0 helper variant

Full OAuth flows (PKCE + redirect interception + Keychain) need
zero-native upstream changes — that's queued as a follow-up. v1
ships a **paste-token-and-refresh** helper that's still useful for
most setups:

1. Use any external tool to obtain an `access_token`.
2. Paste it into the Auth panel's `Access token` field.
3. Optionally fill `refresh_token`, `token_url`, `client_id`,
   `client_secret` (leave blank for public clients / PKCE).
4. The **Yenile / Refresh** button hits `token_url` with the
   refresh creds and updates the access_token in place.

Send fires with `Authorization: Bearer <access_token>` automatic.

## Where credentials live

Every auth field is part of the request snapshot, persisted with
the saved request. They're stored in IDB under the `zero://app`
origin, which is sandboxed by the OS to this app only — but treat
them as you would any local credentials. For production keys,
prefer the env-var `{{token}}` indirection so the actual secret
lives in one place (the active environment) instead of repeated
across saved requests.
