# Phase F follow-up — E2E via zero-native automation hooks

GitHub Issue: [#23](https://github.com/olgunozoktas/api-lab/issues/23)

Priority: P2

## Context

Follow-up to `docs/backlog/P2-2026-05-09-070300-tests-ci.md` (Phase F — Tests + CI/CD; landed 2026-05-09 in `feat/tests-ci`). The original backlog included an E2E item — "launch app, send request, assert response shown" — which was DEFERRED at ship time because the zero-native automation surface isn't documented in api-lab's docs and the driver API needs upfront research.

CEO lens: without E2E, every refactor of the bridge wiring (handler/policy/registry) is a regression risk that won't surface until manual testing. The 19 Zig unit tests + 25 Vitest tests cover the leaf functions; nothing exercises the full JS↔Zig request flow end-to-end. Eng lens: this is the highest-leverage gap left by Phase F — covers the integration seam that the unit tests by design avoid.

The `-Dautomation=true` flag already exists in `build.zig:40` (`automation_enabled`) and toggles "zero-native automation artifacts" of some kind, but the actual driver API (how to send a synthetic bridge invocation, how to read the rendered DOM/response, how to assert from a test process) needs to come from the zero-native source.

## Items

- [ ] Read `~/Herd/zero-native/src/` for the automation surface — what the `-Dautomation=true` flag wires up, what the test driver protocol is, how zero-native projects (next/svelte/vue examples) write their E2E tests if any.
- [ ] Decide the test runner: zero-native's own driver vs `playwright` driving the WKWebView vs a custom Zig harness that talks to the bridge directly.
- [ ] Write at least one happy-path E2E: launch app → send `http.request` to a known fixture endpoint (or local stub) → assert the response renders in the Body tab.
- [ ] Add at least one error-path E2E: send a request to an unreachable URL → assert the error UI shows the curl exit code + stderr.
- [ ] Wire the E2E job into `.github/workflows/ci.yml` (probably a third matrix on `macos-latest` since the binary is macOS-only today).
- [ ] If the local fixture endpoint requires a server, decide between (a) embedded Zig HTTP server in test mode, (b) `python -m http.server` shellout, (c) a public testing endpoint like httpbin.

## Acceptance

`zig build test -Dautomation=true` produces a binary that the E2E harness can drive. At least two E2E test cases (happy path + error path) run green in CI on `macos-latest`. Failure on either case fails the workflow.

## Tradeoffs

- **macOS-only E2E for v1.** zero-native's WKWebView shell is macOS-bound today; a Linux/Windows E2E story comes later when the platform-info abstraction settles. Documenting that in the workflow comment is fine.
- **Cost of CI minutes.** macOS minutes are 10× the Linux rate on GH Actions. Keep the E2E suite tight — happy + error path covers 90% of regressions; resist the urge to test every UI permutation here.
- **Flakiness risk.** WKWebView automation can be flaky around dialog/focus events. If we hit flakes, isolate the assertion surface to JSON output rather than DOM selectors.

## How to work on this

1. Spend the first hour in `~/Herd/zero-native/src/` reading the bridge dispatch + automation paths. Don't write any test code until the driver protocol is clear.
2. Build a tiny harness first — `zig build test -Dautomation=true` + a single bridge invocation, asserting the response shape — before any UI assertions.
3. Add the UI-rendering assertion only after the bridge harness is reliable.
4. Land in a `feat/e2e` worktree per `/backlog-ship` discipline; CEO+Eng ultrathink at end as usual.
