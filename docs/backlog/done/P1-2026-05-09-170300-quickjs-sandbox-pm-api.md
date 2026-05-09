# Phase H.1 — QuickJS sandbox + Postman-compatible pm.* API

Priority: P1

## Context

Pre/post-request scripts are Postman's killer feature: write JS that
runs before each request to set vars, after each response to assert
state, chain calls. Without them we lose the entire workflow of
"call A, extract token from response, use in call B".

Decision (`docs/plans/piped-dazzling-pretzel.md` § Engineering lens):
QuickJS via WebAssembly. Cross-platform, ironclad isolation (sandbox
IS the engine), Postman uses this approach in Newman. ~250 KB WASM.

Security threats covered in the plan's Security lens.

## Items

- [ ] New `frontend/src/lib/scriptSandbox.ts` — load `quickjs-emscripten` lazily, expose `runScript({source, request, env, response?}) -> {request, env, response, asserts, error}`
- [ ] Tiny `pm.*` API surface bound into the sandbox: `pm.environment.get/set`, `pm.variables.replaceIn`, `pm.request.headers.add/upsert`, `pm.request.body.update`, `pm.response.json()`, `pm.response.headers.get`, `pm.test(name, fn)`, `pm.expect(...)` (chai-style)
- [ ] NO `fetch` / `XHR` access from inside the sandbox; network calls only via host-proxied bridge with "from-script" flag
- [ ] Time + memory limits: 5s CPU, 10 MB allocator
- [ ] Result threaded through `lib/sendRequest.ts:send()` — pre-script runs before HTTP, post-script after response, both get a chance to mutate state via the `pm.*` API

## Acceptance

A pasted Postman pre-request script sets an env var; a post-response
script extracts a token from JSON and asserts status === 200. Both
work identically to Postman. A malicious script cannot exfiltrate
localStorage or fetch external URLs without the bridge layer.

## Tradeoffs

QuickJS startup is ~50 ms; not free per-request. We cache the
parsed module per script (script hash → bytecode) so re-runs are
~5 ms. WASM load adds ~250 KB to bundle — code-split as Phase O.0
prerequisite.

## How to work on this

1. Read `frontend/src/lib/sendRequest.ts` for the request build flow
   to thread the script hooks into.
2. Use `quickjs-emscripten` (Postman's choice + actively
   maintained).
3. Reference Postman's `pm.*` API docs to match shape exactly.
