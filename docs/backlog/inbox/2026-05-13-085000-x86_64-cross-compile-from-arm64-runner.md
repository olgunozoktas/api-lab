---
date: 2026-05-13
tier: tbd
---

# x86_64 release builds via cross-compile from arm64 runner

Yesterday's drop of x86_64 from `release.yml` (the macos-13 hosted-runner
queue was sitting on jobs for 2+ hours) closed off Intel Mac users from
the published macOS tarball. We chose drop-over-wait because:

- Apple stopped selling Intel Macs in 2023; the 2026 Mac user base is
  dominantly Apple Silicon (>95% of in-warranty machines).
- The README still documents the source build path, so Intel users
  aren't blocked, just inconvenienced.
- Polish-loop velocity stops if every release sits in an x86_64 queue.

But the option to ship Intel binaries again is worth keeping open. The
cleanest path is **cross-compile from the arm64 runner**:

- Zig handles `-Dtarget=x86_64-macos` natively; the binary is the
  cheap part.
- The frontend bundle (Vite + esbuild output) is architecture-agnostic
  JavaScript — same `dist/` ships on both arches.
- The hard part: the zero-native `.a`/`.dylib` linkage. If the
  WKWebView bridge depends on any host-arch-specific symbols, the
  cross-target build will need `-target x86_64-macos` set on the
  zero-native build too, or a universal binary via `lipo`.
- Could also just produce a universal binary directly with `zig build
  -Dtarget=universal-macos` if Zig supports it for the bridge.

Concrete next steps when this gets picked up:
1. Spike `zig build -Doptimize=ReleaseSafe -Dtarget=x86_64-macos
   -Dzero-native-path=../zero-native` locally on the arm64 dev machine.
   See if zero-native compiles for x86_64 from arm64.
2. If yes — add an `x86_64` matrix arch that uses `macos-latest`
   (arm64 runner) with `-Dtarget=x86_64-macos`. Single runner pool,
   no Intel queue.
3. If no — investigate `lipo` to fuse two arm64-runner builds (one
   native, one `-Dtarget=x86_64-macos`) into a universal binary and
   ship a single `.tar.gz`.

Acceptance: a v0.2.x release where downloading the macOS tarball on
both Apple Silicon and Intel Macs Just Works™, without needing a
macos-13 runner.

Related: this slice's CI commit drops x86_64 — search git log for
`release(ci): drop x86_64`.
