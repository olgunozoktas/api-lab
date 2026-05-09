# Phase N.1 — Linux + Windows builds

Priority: P3

## Context

zero-native supports WebKitGTK on Linux and WebView2 on Windows. Today our `release.yml` only builds macOS arm64 + x86_64. Cross-platform expands the user base 10x.

## Items

- [ ] Add `linux-x86_64-gnu` + `linux-arm64-gnu` matrix entries to `.github/workflows/release.yml`
- [ ] Add `windows-x86_64` matrix entry
- [ ] Linux: produce `.deb` (Debian/Ubuntu) + `.rpm` (Fedora) + `AppImage` (universal)
- [ ] Windows: produce `.msi` (Wix toolset) + portable `.exe` (single-file)
- [ ] Per-platform smoke test: build → launch → fire one HTTP request → assert response body
- [ ] Document install per-platform in README.md

## Acceptance

Tag a release → CI produces 3 macOS + 2 Linux + 1 Windows artifacts → one-click install on each platform launches a working app.

## Tradeoffs

Each platform has its own packaging quirks. Linux native deps differ between distros (libwebkit2gtk version, etc.) — AppImage is the safety net.

## How to work on this

1. zero-native's Linux + Windows guides.
2. WiX toolset for MSI; Wine in CI to test if needed.
3. Code-signing deferred to Phase N.2.
