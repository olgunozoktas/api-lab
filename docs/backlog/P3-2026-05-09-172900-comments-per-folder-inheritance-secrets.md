# Phase M.3 — Comments + per-folder inheritance + secrets vault

Priority: P3

## Context

Polish on top of the Git-sync (M.1) + cloud-sync (M.2) work:

- **Comments**: Markdown comments on requests + folders, stored as files in the workspace (`.req.md` sidecars), syncable via Git.
- **Per-folder inheritance**: folders can have their own auth + headers + scripts that all child requests inherit (Postman's killer org feature).
- **Secrets vault**: env vars and SECRETS are different. Vars sync via Git (.env.example shape); secrets stay machine-local + encrypted (Keychain).

Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Eng lens § 7.

## Items

- [ ] Comments UI: collapsible Markdown area at the top of every request panel + folder header; persisted as `<id>.req.md` next to `<id>.req.json`
- [ ] @mention support (basic — links to a `team/<name>.md` file when multi-author Git sync is in use)
- [ ] Per-folder auth: `auth?: Auth` on `CollectionItem` for folders; on send, walk parent chain and apply the nearest non-null
- [ ] Per-folder headers: same shape — child request inherits parent's headers, with override support
- [ ] Per-folder scripts: parent pre-script runs before child's pre-script; same for post
- [ ] Secrets vault: new `secrets/` dir in the workspace; never committed; entries indexed by env-id + key; encrypted with the same libsodium key as M.2
- [ ] Settings → "Secrets" panel: list / add / delete; never echoes the value back, only "set" / "not set" indicator

## Acceptance

A folder with `auth = bearer` and `headers = {X-Trace: abc}` propagates to every nested request unless overridden. A secret `STRIPE_KEY` referenced as `{{STRIPE_KEY}}` in a request resolves at send time but never appears in any synced file.

## Tradeoffs

Inheritance order conflicts have to be resolved (folder vs request) — folder wins for headers, request wins for body, auth follows the most-specific match.

## How to work on this

1. Phase M.1 + M.2 first.
2. Inheritance walk in `lib/sendRequest.ts:send` — climb from request to root, accumulate.
