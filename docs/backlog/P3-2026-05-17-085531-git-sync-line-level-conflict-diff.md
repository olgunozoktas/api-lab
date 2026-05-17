# Git sync — line-level conflict diff + resolution

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-073400-git-based-collection-sync.md`
(shipped 2026-05-17). Git-based collection sync shipped with a
deliberately coarse conflict resolution — when a pull conflicts, the
banner offers whole-file **Keep local** / **Take remote**. That is
honest ("never silently merged") but blunt: a user who changed
collection A on machine 1 and collection B on machine 2 must discard
one machine's work wholesale.

The delightful version surfaces *what* differs and lets the user
resolve at a finer grain.

## Items

- [ ] On a sync conflict, parse both sides of `api-lab-sync.json`
  (the `git.sync.read` payload + the conflicted/remote version) and
  diff them per collection-item / per environment.
- [ ] A conflict modal listing each differing item with a local vs.
  remote preview and a per-item Keep-local / Take-remote choice.
- [ ] Assemble the resolved payload, write it back, commit + push
  (extend `git.sync.resolve` or add a `git.sync.resolveMerged`).
- [ ] Tests for the diff/merge logic (pure — diff two `SyncPayload`s).

## Acceptance

A conflict where each machine touched different collections can be
resolved keeping both sides' changes, without discarding either
machine's work wholesale.

## Tradeoffs

- More UI + a merge algorithm vs. the coarse v1. Worth it only once
  users actually hit multi-collection conflicts — until then the
  coarse resolution is adequate.

## How to work on this

1. `frontend/src/lib/gitSync.ts` — `parseSyncPayload` already gives
   typed `SyncPayload`s to diff.
2. `frontend/src/components/SyncBanner.tsx` — today's coarse banner;
   the modal would open from it.
3. `src/handlers/git_sync.zig` — `git.sync.resolve` is the current
   whole-file checkout; a merged-write variant goes alongside it.

## Reference

- Parent: `docs/backlog/done/P2-2026-05-09-073400-git-based-collection-sync.md`
