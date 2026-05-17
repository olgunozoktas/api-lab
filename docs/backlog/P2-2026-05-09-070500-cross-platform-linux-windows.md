# [BLOCKED] Phase G — Cross-platform support (Linux + Windows)

Created: 2026-05-09 07:05:00
Refined: 2026-05-16 08:24:00
Priority: **P2** (Real feature expansion — broadens the user base beyond macOS. Not blocking, since macOS ships today, but a deliberate product direction that gates Phase H distribution.)
GitHub Issue: [#7](https://github.com/olgunozoktas/api-lab/issues/7)
Status legend: `- [ ]` = to do, `- [x]` = implemented

## Context

Originally captured via /inbox on 2026-05-09 07:05:00.

API Lab currently builds and runs on macOS only (WKWebView host). The
underlying zero-native shell already supports WebKitGTK on Linux, so
Linux is the cheaper first target; Windows (WebView2) is second and
heavier. Cross-platform is the prerequisite for Phase H distribution
(`.deb` / AppImage / signed `.exe`) — there is no point packaging for
platforms the app can't run on.

Known starting points from the capture:
- zero-native already supports WebKitGTK (Linux).
- `app_dirs` resolution is already cross-platform.
- `curl` ships by default on macOS + Linux; Windows needs it bundled
  or a native-HTTP fallback in the bridge handler.

## Items

- [ ] **Linux build + run support.** Add `linux` to `app.zon`'s
  `.platforms` with any per-platform asset paths. Do a path-discipline
  audit first — grep the Zig + build scripts for hardcoded `/Users/`,
  macOS-only paths, and backslash assumptions; `app_dirs` is already
  cross-platform but the build glue may not be. Confirm the `curl`
  bridge handler works unchanged under WebKitGTK. Build and run on a
  *real* Linux machine or VM (not theoretical), then document the
  `apt` / `dnf` dependency list (`libwebkit2gtk-4.1`, etc.) in the
  README. Touchpoints: `app.zon`, `build.zig`, `build.sh`,
  `src/main.zig`, `README.md`.
- [ ] **Windows build + run support.** Add `windows` to `app.zon`'s
  `.platforms`; host the WebView via WebView2. Resolve the `curl`
  dependency — either bundle a `curl.exe` or fall back to a native
  HTTP path in `src/handlers/http.zig` when `curl` is absent. Add a
  WebView2-runtime requirement note to the README. Build and run on a
  real Windows machine. Touchpoints: `app.zon`, `build.zig`,
  `src/handlers/http.zig`, `README.md`.

## Progress (2026-05-16) — verifiable prep landed, runtime BLOCKED

The portable prep work shipped on the macOS dev machine; both items
stay `- [ ]` because their Acceptance ("build and run on a real
Linux/Windows machine") cannot be met without that hardware. Title is
prefixed `[BLOCKED]` so `/backlog-next` skips it until a Linux/Windows
machine or VM is available — it is not abandoned, just gated.

**Landed (verifiable on macOS):**
- Path-discipline audit — `grep -rn '/Users/' src build.zig build.sh`
  is clean; no hardcoded home paths, no macOS-only path literals in
  the Zig sources or build glue.
- `app.zon` `.platforms` now declares `macos`, `linux`, `windows`
  (declarative manifest metadata; `build.zig` selects the real target
  from the build flags).
- `build.sh` resolves the webview cache + state directories per OS
  via `uname` (macOS `~/Library`, Linux XDG base dirs, Windows
  `%LOCALAPPDATA%`) and picks the `.exe` binary name on Windows. The
  macOS branch is byte-identical to the previous hardcoded values.
- `README.md` gained a **Platform support** section with the apt/dnf
  dependency lists (`libwebkit2gtk-4.1-dev` + `libgtk-4-dev` /
  `webkit2gtk4.1-devel` + `gtk4-devel`) and the WebView2-runtime note.

**Still BLOCKED — needs real Linux + Windows hardware:**
- Actually building + launching a working window on Linux (WebKitGTK)
  and Windows (WebView2). zero-native's `build.zig` already has the
  GTK / WebView2 link branches, but "compiles" ≠ "works" for a
  webview host — the file's own How-to-work forbids compile-only sign-off.
- The Windows `curl` decision (bundle `curl.exe` vs. native-HTTP
  fallback in `src/handlers/http.zig`) — deliberately deferred to the
  Windows slice, which needs a Windows machine to validate.
- A cross-platform CI build matrix.

Unblock by running the build on a Linux VM + Windows machine, fixing
what breaks, then checking the two items and removing the `[BLOCKED]`
prefix.

## Acceptance

API Lab builds and launches a working window on Linux (WebKitGTK) and
Windows (WebView2), each verified on real hardware/VM, with the HTTP
bridge functional on both. Per-platform dependency requirements are
documented in the README.

## Tradeoffs & risks

- Each platform must be tested on real hardware/VM — "compiles" is not
  "works" for a webview host. This is genuine manual QA cost.
- The maintenance surface grows ~3× — every future bridge handler and
  build change now needs cross-platform consideration.
- CI currently builds macOS arm64 only; a real cross-platform story
  needs a build/test matrix (see follow-up below).
- Windows `curl` is the biggest unknown — bundling adds binary weight
  and a signing/trust concern; a native-HTTP fallback is more code in
  the bridge handler. Decide deliberately during the Windows slice.

## How to work on this

Do Linux first — it is the cheaper target (zero-native already
supports WebKitGTK). Start the Linux slice with the path-discipline
audit (`grep -rn '/Users/' src build.zig build.sh`), then add the
platform to `app.zon`, build on a Linux VM, fix what breaks, and
document deps. Only then start Windows, where the `curl` decision is
the crux. Use `./build.sh` as the entry point on every platform —
extend it with per-platform branches rather than forking it. Verify
each platform by launching the app and sending a request through the
bridge; never mark a platform done from a successful compile alone.
