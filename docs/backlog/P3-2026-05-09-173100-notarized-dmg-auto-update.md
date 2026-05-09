# Phase N.2 — Notarized .dmg + auto-update + Homebrew cask

Priority: P3

## Context

Distribution polish for macOS. Notarized .dmg lets users install without "unidentified developer" warnings. Auto-update keeps users on the latest without manual checks. Homebrew cask gets discoverable via `brew install --cask api-lab`.

## Items

- [ ] Apple Developer ID code-signing: extend `release.yml` with `codesign` + `xcrun notarytool` step
- [ ] Build .dmg from the signed .app via `create-dmg`
- [ ] Attach .dmg to the GH release alongside the existing tarballs
- [ ] Sparkle (or Sparkle-like) auto-update: check for new GH release on launch (opt-in)
- [ ] Homebrew cask: file a PR to homebrew-cask with the formula referencing GH releases

## Acceptance

User downloads .dmg → drags to Applications → app launches without Gatekeeper prompts. Future releases auto-prompt for update on launch.

## Tradeoffs

Apple Developer Program costs $99/year. Without it we ship un-notarized (works but UX hit). Auto-update is opt-in to honor the "no telemetry" promise (the version-check IS a network call).

## How to work on this

1. Phase N.1 first (cross-platform builds).
2. Apple notarytool docs.
3. Sparkle for macOS — ~80 KB Swift framework.
