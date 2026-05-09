# gRPC reflection cache — per-target store with 5-min TTL

Priority: P2

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-154502-grpc-reflection-service-browser.md`
(shipped 2026-05-09). The Step 8 CEO+Eng pass surfaced this from the
parent file's deferred-item slot.

Today every "Browse services" click re-issues a `grpcurl list` plus N
`grpcurl describe <service>` calls — the full fanout. For a server
with 8-10 services this can take 1-3 seconds. Most of the time the
user is just flipping between methods on the SAME server; re-fetching
the whole tree is wasteful.

The deferred cache idea: keyed by `target` string (e.g.
`grpcb.in:9001`), stash the parsed `services[]` array with a 5-min
TTL. Subsequent browse clicks hit the cache; explicit "Refresh" still
re-fetches.

The 5-min number is a UX call:
- Too short (1-2 min) → users hit the bridge constantly during a
  debugging session.
- Too long (15+ min) → during local proto iteration, users miss
  newly-added methods and have to learn to click Refresh anyway.
- 5 min is the goldilocks zone for the typical "open API Lab → poke
  at a server for a bit → close it" workflow.

## Items

- [x] Add a `reflectionCache` slice to the Zustand store
      (`frontend/src/store/`). Shape:
      `Map<target, { fetchedAt: number, services: GrpcReflectService[] }>`.
- [x] Container reads cache before invoking `grpc.reflect.list`. Hit
      = pass cached services to sidebar state (kind: "ready").
      Miss / stale = fetch + populate cache with `Date.now()`.
- [x] "Refresh" button explicitly invalidates the entry for the
      current target before re-fetching.
- [x] TTL constant: `REFLECTION_CACHE_TTL_MS = 5 * 60 * 1000`
      colocated with the cache slice. Easy to tune without code
      rewrite.
- [x] Tests: cache hit returns same `services[]`; stale entry
      triggers re-fetch; Refresh invalidates the entry.
- [x] Hint surface: when serving from cache, show a tiny "(cached
      Xm ago)" badge next to the services-count header so the user
      knows whether they're seeing fresh or stale data.

## Acceptance

User browses `grpcb.in:9001` (1.5s fanout). User browses again — 0ms,
hits cache. Badge shows "(cached 12s ago)". User clicks Refresh — fresh
fanout, badge resets. User waits 6 minutes, browses again — fresh
fanout (TTL expired).

## Tradeoffs

Cache invalidation when proto evolves on the server side: the user
has to know to click Refresh, OR wait for TTL. Acceptable for v1; if
this becomes painful, listen for grpcurl's "method not found" errors
on the next Send and auto-invalidate.

The cache lives in-memory only (no persistence). On window close +
reopen the cache is gone. Adding IDB persistence would marginally
help but introduces stale-cache-from-yesterday risk; keep it
in-memory for now.

## How to work on this

1. Look at `frontend/src/store/index.ts` (or wherever `useStore` is
   defined post-split) for the slice pattern.
2. The container wiring lives in
   `frontend/src/components/GrpcPanelContainer.tsx` — `onReflectLoad`
   is the right entry point to thread cache reads through.
3. The "(cached Xm ago)" badge is mechanical — extend
   `GrpcServicesSidebar`'s ready-state header.

## Status — shipped 2026-05-10

Shipped end-to-end on `feat/grpc-reflection-cache`. All 6 items
checked.

**What landed:**

- New standalone `useReflectionCache` Zustand store at
  `frontend/src/store/reflectionCache.ts` (kept separate from the
  643-LOC `store/index.ts` to avoid further bloat). Map<target,
  {fetchedAt, services}>; actions `getCached`, `setCached`,
  `invalidate`. Not persisted — cache lives only in memory per the
  Tradeoffs section.
- Pure helpers in `frontend/src/lib/reflectionCache.ts`:
  `REFLECTION_CACHE_TTL_MS = 5 * 60 * 1000`, `isStale`, and
  `formatCachedAge` (buckets to seconds < 60 then minutes).
- `GrpcPanelContainer.onReflectLoad` consults the cache before
  invoking the bridge; hits set ready-state with `cachedAt:
  entry.fetchedAt` so the badge renders. Misses fetch + populate.
- New `onReflectRefresh` handler — invalidates + fetches; wired to
  the ready-state Refresh button via a new `onRefresh` prop on
  `GrpcServicesSidebar` (defaults to `onLoad` so the API stays
  drop-in compatible).
- Sidebar's `ready` variant gains optional `cachedAt?: number`. When
  set, a tiny "(cached Xs/Xm ago)" badge appears next to the services
  count via the new `CachedBadge` subcomponent (re-uses `useT()`).
- New i18n keys: `grpc.reflect.cachedAgo.seconds` /
  `grpc.reflect.cachedAgo.minutes` in both `tr.ts` and `en.ts`.
- Tests: 11 new (5 store + 6 lib) → frontend total 256 → 267.

**Acceptance hits:**

- ✅ Browse `grpcb.in:9001` → fetch fires; subsequent click → 0ms
  cache hit with badge.
- ✅ Refresh button invalidates → fresh fanout → badge resets (cache
  hit will re-appear on next implicit browse).
- ✅ TTL boundary correctly considered stale (test pins
  `Date.now()` to TTL exactly).
- ✅ Cache slice not persisted — survives only the session, per
  Tradeoffs.

**Deferrals (none in scope):**

The two Tradeoffs ideas (auto-invalidate on grpcurl "method not
found" errors; IDB persistence) stay deferred per the original
file. Step 8 ultrathink may queue them as P3 follow-ups if they
earn their keep.
