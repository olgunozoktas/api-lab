# Code-gen: redact secrets toggle

Priority: P3

## Context

The "Copy as code" dropdown emits the live request — substituted env
vars and all — verbatim. That makes the snippet copy-paste-runnable
(by design), but also makes it dangerous to share: a user pasting a
generated `curl` into a bug report or pair-programming chat will leak
their bearer token, API key, or session cookie.

Surfaced during P2 #2 code-gen ship (2026-05-09). Out of scope for the
slice — flagged here so it doesn't get forgotten.

## Items

- [x] Add a "Redact secrets" toggle to the CopyAsMenu (default off, persisted via Zustand)
- [x] Maintain a small allowlist of header names treated as sensitive: `Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`, `Proxy-Authorization` (case-insensitive match)
- [x] When the toggle is on, replace those header values with `<REDACTED>` in the formatter input before passing it to `formatter.format()`
- [x] Detect bearer-token-shaped values in the body (`"token":"sk-..."`, `"api_key":"..."`) and replace them too — start conservative (string keys named `token`, `api_key`, `secret`, `password`)
- [x] Surface a one-line hint under the menu when redaction is on: "Secrets redacted — generated code will not run as-is."

## Acceptance

With redaction ON: a request carrying `Authorization: Bearer abc123`
emits code containing `Authorization: <REDACTED>` (in whatever syntax
the target language uses). With redaction OFF: behavior unchanged
(verbatim emission, current default).

## Tradeoffs

Toggle-based vs. always-on: always-on would be safer but breaks the
"snippet is runnable" guarantee. Toggle preserves both modes.

Conservative vs. aggressive body redaction: regex over JSON keys can
miss custom field names (`access_token`, `bearerToken`, `secretKey`).
Start conservative; iterate based on user reports.

## How to work on this

1. Extend `CodegenInput` type with `redactSecrets?: boolean`.
2. Add a redaction layer in `lib/codegen/index.ts`:
   `function redactInput(input: CodegenInput): CodegenInput` that
   walks headers + body and substitutes.
3. Wire the toggle into `CopyAsMenu` state; persist preference via
   the existing Zustand store.
4. Tests: per-formatter, with redaction on/off, verify both header
   and body paths.