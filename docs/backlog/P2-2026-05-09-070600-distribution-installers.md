# Phase H — Distribution (installers, packaging, auto-update)

Created: 2026-05-09 07:06:00
Refined: 2026-05-16 08:26:00
Priority: **P2** (Real feature direction — turns API Lab into an end-user product anyone can install without a toolchain. Not blocking, and partly gated on Phase G, but the macOS half can ship independently.)
GitHub Issue: [#8](https://github.com/olgunozoktas/api-lab/issues/8)
Status legend: `- [ ]` = to do, `- [x]` = implemented

## Context

Originally captured via /inbox on 2026-05-09 07:06:00.

Goal: end users can install API Lab with no compiler and no `dnpm` —
download an installer, run the app. Today the repo ships only a CI
`.tar.gz` of the arm64 binary (the v0.2.45 release) — that is a
developer artifact, not a consumer installer.

The non-macOS items here are gated on
`docs/backlog/P2-2026-05-09-070500-cross-platform-linux-windows.md`
(Phase G) — there is no point packaging for a platform the app cannot
run on. The macOS `.dmg`, the Homebrew tap, and the in-app update
check have no such dependency and can ship first.

## Items

- **macOS `.dmg` installer (signed + notarized).** Build a `.dmg` via
  `create-dmg` in CI from the release binary; code-sign and notarize
  it. Requires an Apple Developer certificate — a procurement action,
  tracked as a blocker below, not part of the code work. Touchpoints:
  the release GitHub Actions workflow, a packaging script.
- **Homebrew tap formula.** Publish a formula in a personal tap
  (`olgunozoktas/homebrew-api-lab`) so `brew install` works; a
  homebrew-core PR can come later. Touchpoints: a new tap repo, a
  formula file, the release workflow (to bump the formula on tag).
- **In-app update check.** On launch, query the GitHub Releases API
  for a newer version than `APP_VERSION` and surface a non-intrusive
  "update available" notification linking to the release. Touchpoints:
  `frontend/src/` (a launch-time check + notification UI), reuse the
  existing `APP_VERSION` plumbing. Keep the network call
  privacy-conscious — one request, no telemetry.
- **Linux packaging (AppImage + `.deb`).** AppImage for run-anywhere,
  `.deb` for apt; flatpak optional. **Depends on Phase G Linux
  support.** Touchpoints: the release workflow, packaging scripts.
- **Windows installer (signed `.exe`).** An installer via Inno Setup
  or WiX; optional `winget` manifest. Requires a Windows code-signing
  certificate (procurement). **Depends on Phase G Windows support.**
  Touchpoints: the release workflow, an installer script.

## Acceptance

A non-developer can install and launch API Lab on macOS (`.dmg` or
`brew install`), Linux (AppImage / `.deb`), and Windows (signed
`.exe`) without a build toolchain, and the running app notifies the
user when a newer release exists.

## Tradeoffs & risks

- **Code-signing certificates cost money and are per-platform** — an
  Apple Developer Program membership ($99/yr) for macOS notarization
  and a Windows Authenticode certificate. Without them, users hit
  Gatekeeper / SmartScreen warnings. This is a procurement blocker the
  user must action separately before the signing work can complete.
- Linux + Windows packaging is gated on Phase G landing first.
- The CI release matrix grows substantially — each platform adds a
  build + package + sign job.
- An auto-update check is a network call on every launch; design it
  as a single best-effort request with a clear opt-out, not telemetry.

## How to work on this

Sequence by dependency. Ship the macOS `.dmg`, the Homebrew tap, and
the in-app update check first — none depend on Phase G. Do the macOS
signing/notarization only once the Apple Developer cert is in hand
(otherwise build an unsigned `.dmg` and leave the sign step stubbed).
Defer the Linux and Windows installers until
`P2-2026-05-09-070500-cross-platform-linux-windows` has landed and the
app actually runs there. Extend the existing release GitHub Actions
workflow with per-platform package jobs rather than forking it. Verify
each installer by installing on a clean machine/VM that has never had
a toolchain — a successful CI artifact is not a verified installer.
