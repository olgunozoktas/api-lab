# Phase O.0 — Code-splitting pass (pdf.js, Spectral, protobuf, source-map-js)

Priority: P2

## Context

Bundle is at 1060 KB JS / 326 KB gz today. Phases J/K/L will pile on pdf.js (~400 KB), Spectral (~500 KB), protobuf.js (~200 KB), redoc (~1 MB). Without code-splitting we blast past the guardrail and slow cold-start.

Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Eng lens § 6 (non-optional before J/K/L ship).

## Items

- [ ] Convert top-of-file imports to dynamic `import()` for: `source-map-js` (resolveStack — already), pdf.js (PDF preview), Spectral (linter), redoc (preview), protobuf.js (gRPC), Argon2 (sync), libsodium (sync), QuickJS WASM (scripts)
- [ ] Use Vite's automatic chunk-splitting; verify chunks land in `frontend/dist/assets/` as separate `.js` files
- [ ] Loading states: each lazy panel shows a tiny spinner while its chunk loads (~100 ms typical on local disk)
- [ ] Update `scripts/check-bundle-size.sh` to track main chunk size separately from total

## Acceptance

Cold-start bundle drops from ~1060 KB to ~400 KB main chunk. PDF preview / OpenAPI editor / scripts / sync each load their chunk on first use, cached thereafter.

## Tradeoffs

Splitting adds tiny perceived lag the first time each feature is used. Acceptable for power features users opt into.

## How to work on this

1. Vite's `import.meta.glob` + dynamic-import pattern.
2. React.lazy + Suspense for the components.
3. Test cold-start time before/after with `performance.timing`.
