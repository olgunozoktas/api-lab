# Keyboard shortcut map — single source of truth

Priority: P3

## Context

Follow-up to `docs/backlog/done/P3-2026-05-18-064055-topbar-discoverability-shortcuts.md`
(shipped 2026-05-18). That slice found the in-app shortcut reference
had drifted: the Guide-hub markdown (`guides/keyboard-shortcuts.*.md`)
was missing `⌘ ,` and `⌘ ⇧ E`, even though `SettingsModal.tsx`'s
inline `<Shortcut>` list had them. Two hand-maintained shortcut
references that can drift independently — and did.

## Items

- [ ] Create a single `lib/shortcuts.ts` data module — the canonical
      list of `{ keys, labelKey, group }` for every app shortcut.
- [ ] `SettingsModal.tsx`'s keyboard section renders from it (note:
      that file is over the 400-LOC cap with a separate split item —
      coordinate; ideally land after / alongside the split).
- [ ] The Guide-hub keyboard reference renders from it too (or a
      build step generates the markdown from it).
- [ ] A test asserts every shortcut the app actually binds (the
      `*_shortcut.ts` hooks + `App.tsx`'s handler) has a matching
      entry — so a new binding can't ship undocumented.

## Acceptance

There is exactly one place to edit when a shortcut changes; the
Settings reference and the Guide reference are both derived from it
and can't drift.

## Tradeoffs

The markdown guide is currently hand-written prose with tables —
generating it from data loses the per-row explanatory text. Option:
keep the prose intro hand-written but generate only the tables, or
have the data module carry a `description` per shortcut.

## How to work on this

Shortcut bindings live in `lib/{guides,settings,env_editor}_shortcut.ts`
and `App.tsx`'s global keydown handler. `SettingsModal.tsx` has the
`<Shortcut>` list; the guide markdown is `guides/keyboard-shortcuts.*.md`.
Coordinate with `P3-2026-05-17-085540-split-settingsmodal-400-loc.md`.
