# Plan — Git-based collection sync

For: docs/backlog/P2-2026-05-09-073400-git-based-collection-sync.md

## Architecture

**Synced data — one file.** Collections + environments mirror to a
single `api-lab-sync.json` in a git clone:
`{schemaVersion, exportedAt, collectionItems, envs}`. One file keeps
conflicts whole-file (no line-level JSON merge hell) and the
read/write trivial.

**Clone location.** The Zig handler owns it — `<HOME>/.api-lab/git-sync`,
resolved from `env_map`. The frontend only ever passes the repo URL +
the JSON content.

**Auth — SSH only in v1.** The handler shells out to `git`; an SSH
remote uses the system SSH agent, so *no secret is stored in the app*.
HTTPS + PAT is deliberately deferred — it needs the Keychain backlog
item (the file's own Tradeoffs say so). Settings offers a repo-URL
field only; the hint says "use an SSH URL".

**`git_sync.zig` bridge handler** (new) — one Context, commands
registered in `main.zig` under a new `git-sync` permission set
(reuses the `network` permission — `git push` is network):
- `git.sync.status` → `{configured, error?}`
- `git.sync.setup {url}` → `git clone url <dir>` if not already a repo
- `git.sync.pull` → `git pull`; reports `{ok, conflict, error?}`
- `git.sync.read` → contents of `api-lab-sync.json`
- `git.sync.push {content, message}` → write file, `git add/commit/push`
- `git.sync.resolve {side}` → `git checkout --ours|--theirs` + commit

Modelled on `http.zig` (Context + handler factory + `std.process.run`).
File I/O via `std.Io.Dir` (handler Context already carries `io`).

**Frontend:**
- `lib/gitSync.ts` — bridge wrappers + `buildSyncPayload` /
  `parseSyncPayload` (pure, unit-tested).
- `store/sync.ts` — a slice holding `syncConfig {enabled, repoUrl}` +
  `syncStatus {state, message, lastSyncAt}`.
- **Settings → "Collection sync"** section: repo-URL field, enable
  toggle, "Set up" + "Sync now" buttons, a status line.
- **Save trigger** — ONE debounced effect in `App.tsx` watching
  `collectionItems` + `envs`; pushes ~2s after the last change when
  sync is on. (Not per-mutation hooks — one integration point.)
- **Pull-on-launch** — one mount effect in `App.tsx`: pull → read →
  apply the synced payload to the store; on a pull conflict, set
  `syncStatus=conflict`.
- **Conflict UI** — coarse, honest: a banner with **Keep local** /
  **Take remote**, wired to `git.sync.resolve`. A line-level diff
  viewer is explicitly out of scope → follow-up.

## Edge cases

- Not configured → every sync path no-ops; default local-only
  experience unchanged (opt-in gate).
- Push fails (offline / auth / non-fast-forward) → `syncStatus=error`
  with the git stderr surfaced, never swallowed.
- Pull conflict → `syncStatus=conflict`, banner; no silent merge.
- `git` absent → `setup` returns a clear error.
- First-ever push to an empty repo → handled (`git push -u`).

## Risks

- Touches the store save path + app init (high blast radius) — the
  watch-effect is additive and gated on `syncConfig.enabled`, so a
  disabled/unconfigured sync changes nothing.
- The bridge is synchronous; a push blocks the bridge thread for the
  push duration. Acceptable for v1 (debounced, infrequent); a truly
  background push needs the AsyncHandler migration (separate item).

## Test coverage

- Zig: pure request-line / JSON-shape helpers in `git_sync` if any;
  the git ops are integration-only.
- Frontend: `gitSync.test.ts` — `buildSyncPayload` round-trips
  `collectionItems` + `envs`; `parseSyncPayload` rejects malformed /
  wrong-schema input.
- End-to-end: a `git init --bare` scratch repo, configure sync, verify
  push then pull from a second clone.

## Status

Inline plan (Path 3C). All 4 items in scope; conflict resolution
ships coarse (keep-local / take-remote), line-level diff deferred.
