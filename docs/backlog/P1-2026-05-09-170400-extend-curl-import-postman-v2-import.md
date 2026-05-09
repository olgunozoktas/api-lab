# Phase I.1 — Richer cURL import + Postman v2.1 collection import

Priority: P1

## Context

Migration story start. cURL paste already works (P2 #2 codegen ship,
2026-05-09); v2.1 collection import is the bigger unlock — every
Postman user has a `.postman_collection.json` and pastes/imports
work to keep using their existing libraries.

Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Phase I.1.

## Items

- [ ] cURL parser already exists at `frontend/src/lib/curlParse.ts` — extend to handle `-F` multipart, `--cookie-jar`, `--cacert`, and quoted body with newlines (deferred to Phase E.1's multipart work)
- [ ] New `frontend/src/lib/importers/postmanV2.ts` — parser for v2.1 schema
- [ ] Walks the `item[]` tree (folders + requests, recursive) → maps to our `CollectionItem[]` shape
- [ ] Translates Postman `auth.type` ↔ our `Auth.type` (bearer, basic, apikey, oauth2 stub)
- [ ] Translates Postman `event[].listen=prerequest|test` → fields on our future `request.scripts.{pre,post}` (placeholder until Phase H.2)
- [ ] Variables → environments (one Postman env file → one of our envs)
- [ ] Import preview modal: tree view of incoming items, "Import all" / "Pick subset" / "Cancel"
- [ ] Tests: round-trip a real Postman v2.1 example

## Acceptance

Drop the official Postman v2.1 example schema (or any community
collection from the Postman API Network) into the import dialog,
get a working tree of folders + requests with auth + body
preserved.

## Tradeoffs

v2.1 is the de-facto standard; older v1 not supported (negligible
real-world usage). Postman scripts come across as raw strings —
they only execute once Phase H.1 ships.

## How to work on this

1. Read `frontend/src/lib/types.ts:CollectionItem` for the target
   shape.
2. Postman v2.1 schema reference: https://schema.postman.com/json/collection/v2.1.0/collection.json
3. Reuse the existing `frontend/src/store/index.ts:addFolder` and
   manual item insertion to populate the tree atomically.
