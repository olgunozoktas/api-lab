# Phase A — React + Tailwind v4 refactor

GitHub Issue: [#22](https://github.com/olgunozoktas/api-lab/issues/22)

Priority: P1

## Context

Vanilla HTML/JS UI replaced with React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand. dnpm-managed build pipeline in `frontend/`, with `frontend/dist/` synced to host as the asset root for zero-native.

## Items

- [x] Vite + React 19 + TS scaffold via dnpm
- [x] Tailwind v4 with `@theme` Apple-style design tokens
- [x] Zustand store with `localStorage` persistence + memory fallback
- [x] Components: TopBar, Sidebar, CollectionList, HistoryList, RequestComposer, UrlBar, KvTable, AuthPanel, BodyPanel, GraphqlPanel, ResponseViewer, ResponseHead, ResponseBody, EnvEditorModal, Toast
- [x] Native HTTP via Zig bridge + browser fetch fallback
- [x] All Phase 1 features preserved: GraphQL mode, env `{{var}}` substitution, JSON syntax highlight, copy-as-cURL, ⌘+Enter / ⌘+S / ⌘+N
- [x] Each component file ≤ 400 lines (project-wide hard rule)
- [x] Legacy `src/index.html` removed; `src/main.zig` points at `frontend/dist`

## How shipped

- Vite bundle: 224 KB JS + 19 KB CSS (gzipped: 70 KB)
- Native binary still 2.9 MB
- Cold start unchanged (~200 ms)
