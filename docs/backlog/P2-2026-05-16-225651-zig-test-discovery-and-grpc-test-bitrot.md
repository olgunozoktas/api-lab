# Wire up Zig handler test discovery + fix grpc test bit-rot

Priority: P2

## Context

Follow-up to `docs/backlog/done/P1-2026-05-09-180400-mock-server-zig-sidecar.md`
(shipped 2026-05-16). While shipping the mock server, `zig build test`
was found to discover **0 tests project-wide** — `main.zig` (the test
compilation root) had no `test {}` block, so Zig never reached the
`test { _ = @import("..._test.zig"); }` chains in `http.zig`,
`grpc*.zig`, etc. Every existing Zig test (http_test.zig, the four
grpc suites, the bridge tests) has silently never run in CI — CI's
`zig build test` step was trivially green because it executed nothing.

The mock-server slice added a `test {}` block to `main.zig` but wired
in **only `handlers/mock.zig`** — because wiring the rest surfaced a
compile error: `grpc_tls_test.zig` has bit-rotted against the Zig 0.16
std API (it calls a removed `Io.File.readAll` overload). Wiring all
handler tests at once would break the build.

This item makes the whole Zig test suite real again.

## Items

- [ ] Audit every `src/handlers/*_test.zig` for Zig 0.16 std-API
  bit-rot. Known: `grpc_tls_test.zig:43` calls `f.readAll(testing.io,
  &buf)` — `Io.File.readAll` no longer takes that shape. Check the
  other grpc test files (`grpc_test.zig`, `grpc_messages_test.zig`,
  `grpc_reflect_parsers_test.zig`) the same way.
- [ ] Fix each bit-rotted test against the current std API so it
  compiles and passes.
- [ ] Extend `main.zig`'s `test {}` block to `_ = @import(...)` every
  handler file (`http.zig`, `grpc.zig`, `grpc_reflect.zig`,
  `grpc_tls.zig`, plus `mock.zig` which is already there), so
  `zig build test` discovers the full suite.
- [ ] Confirm `zig build test` (CI-default, no `-Dmock-it`) runs the
  full suite green, and consider flipping the mock integration test
  on in CI now that it is proven stable.

## Acceptance

`zig build test` reports a non-zero test count covering http + grpc +
mock + bridge handler tests, and is green. A deliberately-broken
assertion in any handler test file makes `zig build test` fail (proving
discovery actually reaches it).

## Tradeoffs

- Fixing bit-rotted tests may surface real regressions that the dead
  tests would have caught — that is the point; treat any failure as a
  genuine bug to fix, not a test to delete.
- `main.zig` carrying a `test {}` block that imports handler files is
  the standard Zig test-root pattern; it adds no runtime cost (test
  blocks are stripped from non-test builds).

## How to work on this

1. `zig build test --summary all` and run the compiled test binary
   directly to see the per-test pass/skip list (the build step alone
   prints nothing on success).
2. Fix `grpc_tls_test.zig` first — it is the known blocker.
3. Add handler imports to `main.zig`'s `test {}` block one at a time,
   rebuilding after each, so a new bit-rot is isolated immediately.

## Reference

- Parent: `docs/backlog/done/P1-2026-05-09-180400-mock-server-zig-sidecar.md`
- Test-root block already added: `src/main.zig` (bottom `test {}`).
- Zig 0.16 std API gotchas: `CLAUDE.md` → "Hard gotchas".
