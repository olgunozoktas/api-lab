# x86_64 macOS release builds via cross-compile from the arm64 runner

Created: 2026-05-13 08:50:00
Refined: 2026-05-16 08:30:00
Priority: **P3** (Re-opens Intel Mac release coverage. Low urgency — Intel Macs are a small, shrinking share and the README source-build path still works — but worth keeping the door open.)
GitHub Issue: (none — captured directly, not mirrored)
Status legend: `- [ ]` = to do, `- [x]` = implemented

## Context

Originally captured via /inbox on 2026-05-13 08:50:00.

`release.yml` dropped the x86_64 build because the macos-13 hosted
runner queue was sitting on jobs for 2+ hours, stalling the polish
loop. Drop-over-wait was the right call (Apple stopped selling Intel
Macs in 2023; >95% of in-warranty machines are Apple Silicon; the
README still documents the source build, so Intel users are
inconvenienced, not blocked). But shipping Intel binaries again is
worth keeping possible — the clean path is to **cross-compile from
the arm64 runner** and never touch the macos-13 queue.

Zig cross-compiles to `x86_64-macos` natively, and the Vite frontend
bundle is architecture-agnostic JavaScript. The unknown is the
zero-native `.a`/`.dylib` linkage — whether the WKWebView bridge
cross-targets cleanly or needs `-target x86_64-macos` on the
zero-native build too.

## Items

- [ ] **Spike the cross-target build locally.** On the arm64 dev
  machine, run `zig build -Doptimize=ReleaseSafe -Dtarget=x86_64-macos
  -Dzero-native-path=../zero-native` and see whether zero-native
  compiles for x86_64 from arm64.
- [ ] **If the spike succeeds — add an x86_64 matrix arch** that runs
  on `macos-latest` (arm64 runner) with `-Dtarget=x86_64-macos`. One
  runner pool, no Intel queue. Touchpoints: `.github/workflows/release.yml`.
- [ ] **If it does not — investigate `lipo`**: fuse a native arm64
  build and a `-Dtarget=x86_64-macos` build (both from the arm64
  runner) into a universal binary, shipped as a single `.tar.gz`.
  Also evaluate `zig build -Dtarget=universal-macos` if Zig supports
  it for the bridge.

## Acceptance

A v0.2.x release whose macOS tarball runs on both Apple Silicon and
Intel Macs, produced without any macos-13 runner in the pipeline.

## Tradeoffs & risks

- The zero-native bridge linkage is the real unknown — the spike
  (item 1) is a genuine gate; the rest of the plan branches on it.
- A universal binary roughly doubles the tarball size; a separate
  x86_64 artifact keeps each download lean but adds a matrix entry.

## How to work on this

Do the spike first — it is cheap and it decides everything. If
zero-native cross-targets cleanly, the CI change is a one-line matrix
addition. If not, fall back to the `lipo` universal-binary route. The
related CI commit that dropped x86_64 is findable via
`git log --grep 'release(ci): drop x86_64'`.
