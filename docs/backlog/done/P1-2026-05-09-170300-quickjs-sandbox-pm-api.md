# Phase H.1 — QuickJS sandbox + Postman-compatible pm.* API

Priority: P1
Status: SHIPPED — 2026-05-09

## Status

Sandbox + pm.* surface + UI shipped in 0b9df68. Pre-request + test
scripts run inside a QuickJS WASM sandbox via dynamic import (~1.5 MB
chunk lazy-loaded; main bundle +13 KB glue). 21 unit tests cover the
pm.* surface, isolation guarantees (no fetch/XHR/window/localStorage),
CPU + memory limits, and error capture.

pm.* surface delivered:
- pm.environment.{get,set,has,unset}
- pm.request.headers.{add,upsert,remove} (case-insensitive)
- pm.request.body.update (string or object), pm.request.url.{get,set}
- pm.response.{code,status,json(),text(),headers.get,responseTime}
- pm.variables.replaceIn (Mustache {{var}})
- pm.test(name, fn) + pm.expect chai-style (to.equal, to.eql,
  to.be.{ok,true,false,null,undefined}, to.have.{status,property,length},
  to.include, to.match)

Limits enforced at the QuickJS runtime: 5s CPU, 10 MB memory,
256 KB stack. JSON state-passing means no host bindings reach into
the sandbox — the only way out is the bridge layer the host runs
after the script returns.

UI: new "Scripts" tab in RequestComposer with two textareas (pre +
post) and Postman-style placeholder examples. Asserts + console
output land in `SendResult.{preScript,postScript}` but the
response-pane render is deferred to a follow-up polish slice.

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
