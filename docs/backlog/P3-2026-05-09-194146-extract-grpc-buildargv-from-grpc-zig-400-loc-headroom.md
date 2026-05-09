# Extract `buildArgv` from grpc.zig — pre-emptive 400-LOC headroom

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-154501-grpc-tls-mtls-cacert-cert-key.md`
(shipped 2026-05-09). The Step 8 Eng Manager pass flagged this as a
breather refactor before the next argv-touching slice lands.

After the TLS slice, `src/handlers/grpc.zig` is 395 LOC — 5 lines under
the project's 400 cap (CLAUDE.md hard rule). Two queued slices that will
push it over:

1. **gRPC reflection service browser** (P2 #154502) — adds
   `grpc.reflect.list` + `grpc.reflect.skeleton` bridge commands plus a
   `buildReflectArgv` helper. Realistic +60 LOC.
2. **gRPC streaming v2** (deferred to backlog Status section of the J.2
   archive) — argv changes for client/server/bidi streaming flags
   (`-d @` for stdin streams, etc.). Realistic +30-50 LOC.

Either lands → grpc.zig over 400. The pattern then becomes "scramble to
extract under deadline" instead of "extract first, then add cleanly".

The natural extraction is `src/handlers/grpc_argv.zig`:

- `pub fn buildArgv(a, req, tls) ![]const []const u8` (current pure
  helper, moved as-is)
- room for `buildReflectArgv` and any future argv shape

This mirrors the existing split: `grpc_messages.zig` (parser),
`grpc_tls.zig` (tmpfile), `grpc_argv.zig` (argv composition). Each is
focused, testable, and stays well under 400.

## Items

- [ ] Create `src/handlers/grpc_argv.zig` and move `buildArgv` (the
      function body, doc comment, and signature) there verbatim.
- [ ] In `grpc.zig`, replace the local `buildArgv` definition with
      `pub const buildArgv = @import("grpc_argv.zig").buildArgv;` (or
      a re-export pattern matching how `MessageIter` / `parseMessages`
      are re-exported from `grpc_messages.zig` — check for consistency).
- [ ] Move TLS argv tests + non-TLS argv tests from `grpc_test.zig` /
      `grpc_tls_test.zig` into a single `grpc_argv_test.zig`. Keeping
      both old files focused on their own concern.
- [ ] Verify `zig build test` still picks them up via the import graph
      (`test { _ = @import("grpc_argv_test.zig"); }` in the new file
      or in `grpc_argv.zig`).
- [ ] Confirm grpc.zig drops to ~340 LOC and grpc_argv.zig lands ~80-90.

## Acceptance

`wc -l src/handlers/grpc.zig` ≤ 350. `zig build test` passes with the
same test count. No behavior change — pure file reshuffle.

## Tradeoffs

Pure refactor with zero user-visible change. Risk: introducing a build
graph hiccup if the re-export isn't syntactically right. Mitigation:
small commit, run `zig build` between each step.

Alternative: leave grpc.zig as-is (395) and do the extraction inside
the next argv-touching slice. Cost of that path: bigger diff in that
slice, mixing "feature work" with "scaffolding work" — less reviewable.
This file's purpose is to keep that cost off the next slice.

## How to work on this

1. Read `src/handlers/grpc_messages.zig` and how `grpc.zig` re-exports
   `MessageIter` + `parseMessages` — that's the canonical pattern.
2. Move `buildArgv` (lines ~155-215 in grpc.zig as of this writing).
3. Tests live in two files today (TLS in grpc_tls_test.zig, non-TLS in
   grpc_test.zig). Decide: consolidate into `grpc_argv_test.zig`, or
   leave as-is. Consolidation is cleaner; either works.
4. Verify the import in `grpc_test.zig` and `grpc_tls_test.zig` still
   resolves (`const grpc = @import("grpc.zig");` then `grpc.buildArgv`
   should still work via re-export).
