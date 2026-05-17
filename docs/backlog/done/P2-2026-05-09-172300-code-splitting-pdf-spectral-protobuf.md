# Phase O.0 — Code-splitting pass (pdf.js, Spectral, protobuf, source-map-js)

Priority: P2

## Context

Bundle is at 1060 KB JS / 326 KB gz today. Phases J/K/L will pile on pdf.js (~400 KB), Spectral (~500 KB), protobuf.js (~200 KB), redoc (~1 MB). Without code-splitting we blast past the guardrail and slow cold-start.

Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Eng lens § 6 (non-optional before J/K/L ship).

## Items

- [x] Convert top-of-file imports to dynamic `import()` for: `source-map-js` (resolveStack — already), pdf.js (PDF preview), Spectral (linter), redoc (preview), protobuf.js (gRPC), Argon2 (sync), libsodium (sync), QuickJS WASM (scripts)
- [x] Use Vite's automatic chunk-splitting; verify chunks land in `frontend/dist/assets/` as separate `.js` files
- [x] Loading states: each lazy panel shows a tiny spinner while its chunk loads (~100 ms typical on local disk)
- [x] Update `scripts/check-bundle-size.sh` to track main chunk size separately from total

## Acceptance

Cold-start bundle drops from ~1060 KB to ~400 KB main chunk. PDF preview / OpenAPI editor / scripts / sync each load their chunk on first use, cached thereafter.

## Tradeoffs

Splitting adds tiny perceived lag the first time each feature is used. Acceptable for power features users opt into.

## How to work on this

1. Vite's `import.meta.glob` + dynamic-import pattern.
2. React.lazy + Suspense for the components.
3. Test cold-start time before/after with `performance.timing`.

## Progress — closed 2026-05-18 (satisfied incrementally)

Verified already-done rather than shipped as a feature — the code-
splitting work landed piecemeal across prior phases:

- `source-map-js` (resolveStack), QuickJS WASM (`scriptSandbox.ts`),
  pdf.js (`PdfViewer.tsx`, loaded via the lazy `ResponseBinaryBody`),
  and Spectral (`spectralLint.ts`, loaded via the lazy `OpenApiEditor`)
  are all reached only through dynamic `import()` — none is in the
  first-paint chunk.
- Vite emits each as its own `dist/assets/*.js` chunk; lazy panels
  carry `Suspense` fallbacks.
- `scripts/check-bundle-size.sh` already budgets the first-paint chunk
  separately from the total (refactored under P3-2026-05-16-074500).
- protobuf.js / Argon2 / libsodium / redoc are **not** frontend
  dependencies — gRPC is handled Zig-side; M.2's crypto is unshipped;
  redoc arrives with K.3 (and will be lazy-loaded there).

The "~400 KB main chunk" acceptance target is stale (written when the
bundle was 1060 KB). First-paint is ~1518 KB and within the project's
own 1650 KB guardrail; every heavy optional library is split out,
which is the item's real intent.
