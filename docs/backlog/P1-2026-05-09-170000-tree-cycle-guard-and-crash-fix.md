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

- [ ] Pass an ancestor-IDs `Set<string>` through `TreeNode` recursion in `frontend/src/components/CollectionList.tsx`; refuse to recurse if `item.id` is already in the set
- [ ] Same defense at `moveCollectionItem` in `frontend/src/store/index.ts` (already partial — verify)
- [ ] Verify `~/Herd/zero-native/src/scheme_handler*.zig` (or equivalent) serves `.js.map` with `application/json` MIME
- [ ] If not served, choose: (a) inline source maps in dev only, (b) patch zero-native MIME table, (c) add `debug.sourceMap(jsUrl)` bridge command
- [ ] In `ErrorBoundary.tsx`: disable Copy button while `state.resolving === true` and show "Resolving…" inside the button label
- [ ] Prepend `error.name + ": " + error.message` to the displayed `<pre>` and the Copy report so the actual message is captured (not just frames)
- [ ] Add a vitest unit test for `descendantIds` against a synthesized cycle (id → parent → grandparent → id loops)

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
