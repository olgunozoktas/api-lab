# Phase K — Optional git-based collection sync

Created: 2026-05-09 07:34:00
Refined: 2026-05-16 08:30:00
Priority: **P2** (Real feature — gives collections/envs a no-lock-in sync story. Opt-in, not blocking, but a meaningful product direction for multi-machine users.)
GitHub Issue: [#12](https://github.com/olgunozoktas/api-lab/issues/12)
Status legend: `- [ ]` = to do, `- [x]` = implemented

## Context

Originally captured via /inbox on 2026-05-09 07:34:00.

Bruno-style sync: the user points API Lab at a git repo, and
collections + environments are mirrored there as plain JSON files. No
vendor lock-in, no cloud account, no proprietary format — opt-in only.
Persistence today lives entirely in browser `localStorage`; sync needs
a native bridge handler that shells out to `git` (mirroring the
`curl`-subprocess pattern in `src/handlers/http.zig`).

## Items

- **Sync settings + native git bridge handler.** A Settings entry for
  the sync repo URL + auth method (SSH key path or PAT). A new Zig
  bridge command (`git.sync` or similar) that shells out to `git`,
  registered in `src/main.zig`'s policy table. Touchpoints:
  `src/handlers/`, `src/main.zig`, `app.zon`, Settings UI.
- **Write-on-save → background commit + push.** On collection/env
  save, serialise to JSON in the local clone and run
  `git add` + `git commit` + `git push` in the background, surfacing
  a non-blocking sync-status indicator. Touchpoints: the store's save
  path, the git bridge handler.
- **Pull-on-launch.** When sync is configured, `git pull` at startup
  before hydrating the store. Touchpoints: app init, git handler.
- **Conflict resolution.** On a pull conflict, surface a manual diff;
  never auto-merge collection JSON. Touchpoints: a conflict UI.

## Acceptance

A user configures a sync repo, edits collections on machine A, and
sees those edits on machine B after a launch pull — with conflicts
surfaced for manual resolution, never silently merged.

## Tradeoffs & risks

- Auth secrets (PAT / SSH key path) must be stored — coordinate with
  the Keychain backlog item rather than putting a PAT in
  `localStorage`.
- Background push can fail (offline, auth, rejected non-fast-forward);
  the status indicator must make failures visible, not swallow them.
- Requires `git` on the host (safe assumption for the dev audience).
- Opt-in only — the default local-only experience must not change.

## How to work on this

Build the native git bridge handler first — model it on
`src/handlers/http.zig` (parse a JSON payload, `std.process.run` the
`git` subprocess, return a JSON result) and register its policy in
`src/main.zig`. Then wire the store's save path to the background
commit/push, then pull-on-launch, then the conflict UI last. Verify
end-to-end with two clones of a scratch repo. Keep the whole feature
behind an explicit opt-in toggle.
