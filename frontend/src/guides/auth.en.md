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
| `AWS SigV4`          | `Authorization: AWS4-HMAC-SHA256 …` + `X-Amz-Date`        |
| `mTLS`               | (client certificate on the TLS handshake — no header)     |

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

## AWS Signature v4

For AWS services — S3, API Gateway, Lambda function URLs, anything
that expects SigV4. Pick **AWS SigV4** and fill:

- **Access key ID** / **Secret access key** — your IAM credentials.
- **Region** — e.g. `us-east-1`.
- **Service** — e.g. `s3`, `execute-api`.
- **Session token** — only for temporary (STS) credentials; leave
  blank otherwise.

API Lab signs the request locally just before send: it builds the
SigV4 canonical request, derives the signing key, and adds the
`Authorization`, `X-Amz-Date`, and `X-Amz-Content-Sha256` headers.
The secret key is used only for the local HMAC — it never leaves
the app. `{{var}}` substitution works on every field.

## mTLS (client certificate)

For endpoints that require a client certificate on the TLS
handshake — mutual TLS, common for internal services. Pick **mTLS**
and point at the PEM files on disk:

- **Client cert (PEM path)** — path to the certificate file.
- **Client key (PEM path)** — path to the private-key file.
- **Key passphrase** — only if the key is encrypted.

curl presents the certificate during the handshake. mTLS runs
through the native request path only — a browser has no
client-certificate API.

## Where credentials live

Every auth field is part of the request snapshot, persisted with
the saved request. They're stored in IDB under the `zero://app`
origin, which is sandboxed by the OS to this app only — but treat
them as you would any local credentials. For production keys,
prefer the env-var `{{token}}` indirection so the actual secret
lives in one place (the active environment) instead of repeated
across saved requests.
