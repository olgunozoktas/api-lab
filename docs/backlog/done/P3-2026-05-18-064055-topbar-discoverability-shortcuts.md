# Frontend upgrade 9/9 — Discoverability: labeled TopBar actions + shortcut hygiene

GitHub Issue: [#35](https://github.com/olgunozoktas/api-lab/issues/35)

Priority: P3

## Context

Part of the 9-item frontend-view-upgrade initiative (2026-05-18
handoff). The audit flagged discoverability gaps: the **Mock** and
**Diff** TopBar buttons are icon-only with no label and no tooltip —
two real features users can't find. Keyboard shortcuts are
inconsistent (some non-standard, e.g. `⌘⇧E` for the env editor) and
hints are surfaced unevenly. Hidden features don't get used.

## Items

- [x] Label — or wrap in the Item-2 Tooltip — the icon-only TopBar
      buttons (Mock, Diff) in `components/TopBar.tsx`.
- [x] Audit the keyboard shortcut map; standardize non-standard
      bindings — prefer *adding* a standard alias over *replacing* an
      existing binding (don't break muscle memory).
- [x] Surface shortcut hints consistently via `ui/kbd-hint.tsx`.
- [x] Update the in-app shortcut reference (Settings → Keyboard /
      guides) to match the audited map.

## Acceptance

Every TopBar action has a label or tooltip; the shortcut reference
matches the actual bindings; no existing shortcut is removed (only
aliased).

## Tradeoffs

Changing shortcuts risks muscle memory — only add standard aliases,
never silently rebind. `SettingsModal.tsx` is already 592 LOC (over
the 400-LOC cap) and has a **separate existing backlog item** to
split it (`P3-2026-05-17-085540-split-settingsmodal-400-loc.md`) —
coordinate: do not add lines to that file; land the split first or
touch only the already-extracted pieces.

## How to work on this

1. Depends on Item 2 (`ui-primitive-library`) for the Tooltip.
2. Touch `components/TopBar.tsx`, `ui/kbd-hint.tsx`, and the shortcut
   reference; coordinate with the SettingsModal-split item.
3. Wave-2 (P3 — lower priority within the wave).
