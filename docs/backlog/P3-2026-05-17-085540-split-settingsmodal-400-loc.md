# Split SettingsModal.tsx to honor the 400-LOC cap

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-073400-git-based-collection-sync.md`
(shipped 2026-05-17). `frontend/src/components/SettingsModal.tsx` is
**592 lines** — well over the project's 400-LOC hard cap. It predates
the cap and has grown section by section (appearance, request
defaults, keyboard reference, about, plus several helper components
defined inline).

The git-sync slice deliberately did NOT add to it — the new
"Collection sync" section was extracted into its own
`SyncSettings.tsx` and SettingsModal only gained a 2-line `<SyncSettings />`
mount. But the host file is still over cap and the next section to
land will face the same pressure.

## Items

- [ ] Extract each settings section into its own component under
  `frontend/src/components/settings/` (e.g. `AppearanceSettings`,
  `RequestDefaultsSettings`, `ShortcutsReference`, `AboutCard`),
  mirroring the `SyncSettings.tsx` extraction.
- [ ] Move the inline helper components (`Field`, `Pill`,
  `ThemeSwatch`, `ResetDefaultsRow`, …) into a shared
  `settings/primitives.tsx` if they are used by more than one section.
- [ ] `SettingsModal.tsx` becomes a thin host: the Dialog shell + the
  section list. Target: under 400 lines (ideally well under).
- [ ] No behaviour change — pure structural refactor; verify with
  typecheck + the existing test suite.

## Acceptance

`SettingsModal.tsx` and every extracted section file are under the
400-LOC cap, the Settings modal renders + behaves identically, and
typecheck + tests stay green.

## Tradeoffs

- Pure refactor, no user-visible delta — no changelog entry / version
  bump (internal-only).

## How to work on this

1. `frontend/src/components/SyncSettings.tsx` is the template for an
   extracted section.
2. Each section is a `<section aria-labelledby=…>` today — lift it
   verbatim into a component, pass any needed store reads inside it
   (Settings sections already read the store).

## Reference

- Parent: `docs/backlog/done/P2-2026-05-09-073400-git-based-collection-sync.md`
- CLAUDE.md → "Max 400 lines per source file".
