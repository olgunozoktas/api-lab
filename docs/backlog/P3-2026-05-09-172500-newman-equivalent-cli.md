# Phase H.4 — Newman-equivalent CLI runner

Priority: P3

## Context

Postman's Newman is the CLI half of the collection runner: load a collection JSON + env JSON, fire all requests, exit 0 on green. Powers CI integration. We need an equivalent so users can `api-lab-run --collection x.json --env prod.json` from CI.

## Items

- [ ] New Zig binary `api-lab-run` built from a separate `src/cli.zig`
- [ ] Loads a collection JSON file (our own format or Postman v2.1 via the Phase I.1 importer)
- [ ] Loads an env JSON file
- [ ] Fires every request sequentially using the existing `src/handlers/http.zig`
- [ ] Pre/post scripts (Phase H.1 sandbox via QuickJS — embed the same WASM)
- [ ] Output: human-readable summary (default) or `--reporter=json` (Newman-compatible) or `--reporter=junit` (CI-friendly)
- [ ] Exit code: 0 if all asserts pass, 1 otherwise
- [ ] Distribute alongside the GUI binary in the GH release tarball

## Acceptance

`api-lab-run --collection my.json --env prod.json --reporter=json` exits 0 on a passing collection, prints structured JSON, produces non-zero exit on a failing one. Drops into a CI pipeline cleanly.

## Tradeoffs

Embedding QuickJS in the Zig CLI binary doubles its size (~3 → 6 MB). Acceptable for CI use.

## How to work on this

1. Phase H.1 + H.3 first (sandbox + runner).
2. Reuse the runner core from H.3; CLI is the thin wrapper.
