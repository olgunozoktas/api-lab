# Phase O.1 — Command palette + vim mode + onboarding tour

Priority: P3

## Context

Power-user UX polish + new-user UX. Command palette (⌘+Shift+P) makes every action keyboard-discoverable. Vim mode wins us a vocal subset of users who'd otherwise stay on Insomnia. Onboarding tour replaces the "30-min Postman learning curve".

## Items

- [ ] **Command palette** (⌘+Shift+P): fuzzy search across every action — "send", "save", "new tab", "switch theme", "open settings", "import cURL", "start mock", every collection's name. Uses the same fuzzy ranker as `frontend/src/components/QuickSwitcher.tsx`
- [ ] **Vim mode** in CodeMirror editors: `@codemirror/vim` plugin, on/off in Settings
- [ ] **Onboarding tour** on first launch (or via Settings → "Show tour again"): 4 frames showing compose → save → reuse → share. Uses the `Toast` component pattern with arrows pointing to the relevant UI parts. Skippable
- [ ] **Saved-search history**: add a star button to history items; saved entries pinned at top
- [ ] More codegen formatters (Phase O.1 polish): Java OkHttp, .NET HttpClient, Rust reqwest, Ruby Net::HTTP — pure formatters, no UI changes

## Acceptance

⌘+Shift+P opens the palette → typing "tok" jumps to "Settings → Theme: Tokyo Night" entry → enter applies. First-launch tour walks through the 4 frames. Vim toggle works in JSON editor.

## Tradeoffs

Onboarding tour adds a non-trivial bundle slice (~30 KB for the tour engine); lazy-loaded.

## How to work on this

1. CodeMirror Vim plugin: https://codemirror.net/examples/vim/
2. Reuse fuzzy ranker from QuickSwitcher.
