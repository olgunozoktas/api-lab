# Phase M.1 — Git sync (file-based, status panel)

Priority: P2

## Context

Bruno's USP is BRU files in a Git repo. We extend the idea: collections + envs serialize as files in the user's chosen Git directory; an in-app status panel shows uncommitted changes, lets the user commit + push without leaving the app. Solo devs sync across machines via their own Git remote — no SaaS.

## Items

- [ ] Workspace serializer: `lib/sync/serialize.ts` writes `collectionItems` as `<id>.req.json` + folder structure on disk; `envs` as `<id>.env.json`
- [ ] Workspace deserializer: reverse — load on app start
- [ ] New "Sync" panel (right sidebar or top-bar dropdown): lists changed files (M / A / D), commit message input, commit + push buttons
- [ ] Bridge: new `git.status / git.add / git.commit / git.push / git.pull` commands wrapping `git` CLI subprocess
- [ ] Auto-pull on app start (if user opted in)
- [ ] Conflict UI: side-by-side diff with manual resolution (file-by-file pick remote / local / merge)

## Acceptance

User configures a git directory path → makes a change to a collection → status panel shows 1 modified file → commits + pushes → another machine pulls and sees the same change.

## Tradeoffs

File-based serialization makes sync trivial but means the app must reload on external file changes (watch via `fs.watch` + debounce).

## How to work on this

1. Phase H.0 (IndexedDB) first — sync needs the larger storage ceiling for big workspaces.
2. Bruno BRU spec for file format inspiration.
3. `git` CLI is present on every dev machine; no library dep needed.
