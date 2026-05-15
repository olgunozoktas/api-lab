# Phase H.2 — Pre/post-request scripts UI + chai-style assertions

Priority: P2

## Context

H.1 ships the QuickJS sandbox + `pm.*` API. This slice ships the
USER-FACING editor + assertion library so users can actually write
scripts.

## Items

- [x] New "Scripts" tab in `RequestComposer.tsx` (alongside Params / Headers / Auth / Body / GraphQL)
- [x] Two side-by-side CodeMirror editors: pre-request script + tests/post-response script
- [x] Run hooks via `lib/sendRequest.ts` — `sendWithScripts()` runs pre before HTTP, post after; App.onSend now calls it and threads the outcomes onto the response
- [x] Chai-style assertion library: `equal` / `eql` / `be.ok|true|false|null|undefined|a|an` / `have.status|property|length` / `include` / `match` — `.be.a()/.an()` type assertions added this slice
- [x] Test results panel: pass/fail per `pm.test(name, fn)` call, in a new **Tests** tab in the response area
- [x] Console.log capture: script `console.log` surfaced in a new **Console** tab in the response area
- [x] Script editor reuses existing CodeMirror config (current JSON editor pattern)

## Acceptance

Paste a Postman post-response script that does
`pm.test("status is 200", () => pm.expect(pm.response.code).to.equal(200))`,
fire the request, see the test result green/red in the Test panel.

## Tradeoffs

Chai is huge; we ship a 200-line subset that covers 80% of Postman
script usage. If users hit limits, file P3 follow-up to vendor full
chai.

## How to work on this

1. Phase H.1 (QuickJS) MUST land first.
2. CodeMirror JSON mode reused for JS — basic syntax highlight is
   enough; users typically paste from Postman, not author here.
3. Postman compatibility shim: keep `pm.*` API surface tight;
   non-supported `pm.*` calls throw a helpful "not yet supported"
   error rather than silent failure.
