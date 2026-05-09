# Phase B — Tabs UI + multi-request workspace

GitHub Issue: [#1](https://github.com/olgunozoktas/api-lab/issues/1)

Priority: P2

## Context

Postman-style tabbed interface — multiple requests open simultaneously, each with its own state. High-leverage feature for power users.

## Items

- [x] `store/tabs.ts` Zustand slice: array of open requests + active tab id — landed in `store/index.ts` + `store/internal.ts` (kept index.ts under the 400-line cap by extracting helpers).
- [x] Top bar tab strip with close (✕), drag-reorder, middle-click close — `components/TabStrip.tsx` (presenter + container).
- [x] ⌘+T new tab, ⌘+W close tab, ⌘+1..9 jump to tab — wired in `App.tsx`'s keydown listener; ⌘+9 jumps to LAST tab (Postman/VSCode convention).
- [x] ⌘+P quick switcher (modal, fuzzy match across collections + history) — `components/QuickSwitcher.tsx`. Sub-sequence + substring scoring, ↑/↓ navigation, Enter activates, Cmd-Enter opens in a NEW tab.
- [x] Persisted across sessions (last-open tabs restored) — `partialize` includes `tabs` + `activeTabId`; `version: 2` migration converts v0/v1 stores by promoting their `current` into a single tab.
- [x] Visual indicator for unsaved changes per tab — `isTabDirty()` compares each tab's request to its saved Collection by id; renders a small accent-colored dot in the close-button slot until hover reveals the X.

## Acceptance

5 tabs open simultaneously, ⌘+P quick-switcher works, tabs survive app restart.
