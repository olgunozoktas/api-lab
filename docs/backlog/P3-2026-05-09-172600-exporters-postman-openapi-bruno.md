# Phase I.4 — Exporters (Postman v2.1, OpenAPI 3.x sketch, Bruno BRU)

Priority: P3

## Context

Importers (Phase I.1, I.2, I.3) cover migration TO API Lab. Exporters cover the reverse: a user wants to share their API Lab collection with a teammate who's still on Postman, or generate an OpenAPI sketch from their requests for others to consume.

## Items

- [ ] `lib/exporters/postmanV2.ts` — collection → Postman v2.1 JSON
- [ ] `lib/exporters/openapi.ts` — collection → OpenAPI 3.x sketch (operations from URL paths; bodies from saved examples; rough but readable)
- [ ] `lib/exporters/bruno.ts` — collection → BRU files in a chosen directory
- [ ] Export dialog: file save destination, format picker, "Include scripts" toggle, "Include env" toggle
- [ ] Round-trip safety: import → export → import gives identical state for v2.1 + Bruno; OpenAPI is one-way (lossy by spec)

## Acceptance

User exports their workspace as a `.postman_collection.json`, imports it in real Postman, every request fires identically.

## Tradeoffs

Postman v2.1 has variant data shapes per request type — exporters cover the 80% (REST, GraphQL); WebSocket/gRPC export deferred until Postman gains parity.

## How to work on this

1. Phase I.1 / I.2 / I.3 first (their parsers establish field mappings).
2. Reverse the same field mappings in the exporters.
