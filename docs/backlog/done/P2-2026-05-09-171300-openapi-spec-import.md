# Phase I.2 — OpenAPI 3.x → collection import

Priority: P2

## Context

Drop a Stripe-sized OpenAPI spec (or any 3.0/3.1 doc), get a tree
of folders + requests with example bodies populated from the spec
— ~600 requests in one click.

This is the second half of "import any API" alongside Postman v2.1
(P1 #170400).

## Items

- [x] New `frontend/src/lib/importers/openapi.ts` — parser for OAS 3.0 + 3.1
- [x] Walk `paths.*.{get,post,...}` → one request per operation
- [x] Group by `tags[0]` → folders; multiple tags → first wins
- [x] Populate request URL from `servers[0].url` + path; substitute `{var}` path params with `:param` placeholder + a header note
- [x] Headers from `parameters` (in: header) + `requestBody.content` (Content-Type)
- [x] Body from `requestBody.content[*].example` or `examples[0]`; if neither present, leave empty
- [x] Auth stub from `securitySchemes` — only the scheme TYPE; user wires the actual creds (we can't import API keys)
- [x] Import feedback — surfaced as the shared import-summary toast + `console.warn` warnings, matching the Postman / Insomnia / HAR / Bruno importers; no separate preview modal was built (consistent project-wide pattern)
- [x] Tests: round-trip Petstore example + Stripe spec smoke test — 16 vitest cases covering OAS 3.0/3.1 detection, the full mapping surface, $ref resolution, and YAML specs

## Acceptance

Drop https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json
into the import dialog → ~600 requests organized into folders by
resource (charges, customers, etc.) with example bodies.

## Tradeoffs

OAS has many ways to express the same thing — first-pass importer
covers the 80%; users can hand-edit corner cases.

## How to work on this

1. Use `@apidevtools/swagger-parser` for parsing + ref resolution.
2. Reuse `frontend/src/store/index.ts:addFolder` to seed the tree.
3. Show import progress (modal updates) for big specs.
