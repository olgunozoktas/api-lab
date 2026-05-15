# Phase I.3 — Insomnia / Bruno / HAR imports

Priority: P2

## Context

Tail of Phase I — covers the long tail of formats users may have
collections in. None individually huge but together they unblock
migrations from every other API tool.

## Items

- [x] **Insomnia v4 (YAML / JSON)** — parser at `lib/importers/insomnia.ts`; nested folders + requests + envs
- [x] **Bruno BRU files** — parser at `lib/importers/bruno.ts`; Bruno's plain-text format is the philosophical sibling of our Git-native sync, so import + export mappings should be tight
- [x] **HAR (HTTP Archive)** — parser at `lib/importers/har.ts`; Chrome DevTools "Save as HAR with content" → batch-import every captured request as history (not collections, since HAR has no naming)
- [x] All three importers surface unsupported-feature warnings — implemented as a warnings toast + `console.warn` rather than a preview modal; Phase I.1 (Postman) shipped this same toast-based pattern, so no preview modal was ever built
- [x] Tests: round-trip an example file from each format

## Acceptance

User exports their Insomnia workspace, drops it in, sees the same
tree of folders + requests + env vars in API Lab. Same for a Bruno
collection. HAR import populates History (not Collections).

## Tradeoffs

Each format is small enough on its own that v1 can be permissive
(skip features we don't model); flag unsupported features in the
preview modal.

## How to work on this

1. Phase I.1 (Postman v2.1 importer) MUST ship first — it
   establishes the importer pipeline + preview modal pattern.
2. Bruno BRU is a custom plain-text format; spec at
   https://docs.usebruno.com/bru-language-tag.html
3. HAR 1.2 spec: https://w3c.github.io/web-performance/specs/HAR/Overview.html
