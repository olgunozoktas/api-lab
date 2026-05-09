# Phase E.fix — TreeNode cycle guard + source-map fetch debug + Copy gating

Priority: P1

## Context

The user's three Copy reports (2026-05-09) show identical minified
stacks ending in deep React reconciler frames (`Ll/Il` 8-deep, then
`ad/nd/$u/Nu/Mu/Ed/xd/Td`). White-screen-of-death on app open after
recent collection-folder + curl-import + ErrorBoundary ships.

Two probable causes from `docs/plans/piped-dazzling-pretzel.md`:

1. **TreeNode infinite recursion** — `CollectionList.tsx`'s recursive
   tree walker has no cycle guard. If migration produces an item with
   `parentId === item.id`, or the user moves a folder into one of its
   own descendants, the `childrenOf.get(it.parentId)` chain loops.
2. **Source-map resolver doesn't fire** — Copy reports stay raw
   minified. Likely `fetch("zero://app/...js.map")` fails (Zig asset
   handler may not serve `.map` files).

## Items

- [x] Pass an ancestor-IDs `Set<string>` through `TreeNode` recursion in `frontend/src/components/CollectionList.tsx`; refuse to recurse if `item.id` is already in the set
- [x] Same defense at `moveCollectionItem` in `frontend/src/store/index.ts` (already had cycle prevention via `descendantIds`)
- [x] Verify `~/Herd/zero-native/src/platform/macos/appkit_host.m` serves `.js.map` — falls through to `application/octet-stream` (no `.map` entry in `ZeroNativeMimeTypeForPath`); fetch still works for sourcemap parser
- [x] In `ErrorBoundary.tsx`: disable Copy button while `state.resolving === true` and show "Resolving…" inside the button label
- [x] Prepend `error.name + ": " + error.message` to the displayed `<pre>` and the Copy report so the actual message is captured (not just frames)
- [x] resolveStackSafe timeout 4s → 30s for cold-cache 4.5 MB sourcemap fetch
- [ ] (deferred) `.map` MIME patch in zero-native — works as-is; future hardening
- [ ] (deferred) Vitest test for `descendantIds` synthesized cycle — defensive guard already shipped; test queued as P3 polish

## Acceptance

App opens cleanly after `./build.sh --reset-state`. Synthesizing a
cycle by manually setting `collectionItems[0].parentId = collectionItems[0].id` in localStorage triggers the cycle guard
(no recursion) and surfaces a toast / debug warning instead of a
crash. Copy reports include the error message AND show resolved
function names when source maps are reachable.

## Tradeoffs

The cycle guard adds a per-frame Set lookup (negligible). Inlining
source maps doubles the bundle (~6 MB) — the bridge-command approach
is cleaner but needs zero-native side work.

## How to work on this

1. Read `frontend/src/components/CollectionList.tsx:TreeNode`.
2. Read `frontend/src/store/internal.ts:descendantIds` for the
   existing helper to reuse.
3. Read `~/Herd/zero-native/src/` for the asset handler. If the
   handler is in `WebViewSource.assets` and Zig's MIME-by-extension
   table is short, add `.map` → `application/json`.
4. Defer the ErrorBoundary copy-disable change to after the bug is
   confirmed reproducible — once the resolver works we'll see the
   real bug.

## Status

**Shipped 2026-05-09.** The defensive items above (cycle guard,
ErrorBoundary message+copy-gate, source-map timeout) all landed in
worktree `feat/crash-fix-license` (merge `d30d724`).

The ACTUAL root cause of the white-screen-of-death turned out to
be a separate bug uncovered once the ErrorBoundary surfaced
`error.message`: **React error #185 (Maximum update depth
exceeded)** caused by a Zustand selector returning a fresh array
on every render in `QuickSwitcher.tsx`. Fixed in commit `dddabd6`
(separate slice — see git log for the full diagnosis).

This file's defensive guards are still good to have (catch
malformed state), but they were not the load-bearing fix. Lesson
captured for future sessions:

> Zustand selectors must be reference-stable. `s.x.filter(...)` /
> `.map(...)` / `.slice(...)` inside a selector returns a new
> array every render → useSyncExternalStore Object.is comparison
> sees "different snapshot" each tick → infinite re-render loop
> → React #185. Read raw, filter via `useMemo` downstream.

## Follow-ups

- `P3-2026-05-09-094100-ui-component-tests.md` already queues the
  testing-library setup that will cover the cycle test deferred above
  (and many more).
- `.map` MIME patch in zero-native is upstream-touching; not blocking.
