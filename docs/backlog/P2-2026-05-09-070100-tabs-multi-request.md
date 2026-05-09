# Phase B — Tabs UI + multi-request workspace

GitHub Issue: [#1](https://github.com/olgunozoktas/api-lab/issues/1)

Priority: P2

## Context

Postman-style tabbed interface — multiple requests open simultaneously, each with its own state. High-leverage feature for power users.

## Items

- [ ] `store/tabs.ts` Zustand slice: array of open requests + active tab id
- [ ] Top bar tab strip with close (✕), drag-reorder, middle-click close
- [ ] ⌘+T new tab, ⌘+W close tab, ⌘+1..9 jump to tab
- [ ] ⌘+P quick switcher (modal, fuzzy match across collections + history)
- [ ] Persisted across sessions (last-open tabs restored)
- [ ] Visual indicator for unsaved changes per tab

## Acceptance

5 tabs open simultaneously, ⌘+P quick-switcher works, tabs survive app restart.
