# Frontend upgrade 8/9 — Micro-interactions & motion pass

GitHub Issue: [#34](https://github.com/olgunozoktas/api-lab/issues/34)

Priority: P3

## Context

Part of the 9-item frontend-view-upgrade initiative (2026-05-18
handoff). The audit found motion is minimal: dialogs fade and context
menus slide, but tree expand/collapse is instant, lists pop in
all-at-once, drag-to-reorder has no lift, copy-feedback isn't
animated, and mode/tab switches are abrupt. This is the **delight
layer** — subtle individually, crafted collectively — and the last
wave, because animating components mid-token-migration causes churn.

## Items

- [ ] Animate tree expand / collapse (`CollectionFolderRow.tsx` /
      `CollectionList.tsx`) — animate height/opacity, not layout thrash.
- [ ] List-stagger entrance for the history and collection lists.
- [ ] Drag-lift feedback (shadow / scale) for collection drag-and-drop.
- [ ] Animate copy-feedback (extend `lib/useCopyFeedback.ts`); smooth
      the tab / mode switches in `TabStrip.tsx`.
- [ ] Standardize a 0.2-0.3s easing token; **honour
      `prefers-reduced-motion`** everywhere (pairs with the
      high-contrast-theme accessibility ethos).

## Acceptance

Tree expand, list entrance, drag, copy-feedback and tab switches all
animate at a consistent 0.2-0.3s ease; `prefers-reduced-motion`
disables every animation added here; large collections animate
without jank.

## Tradeoffs

Pure polish — lowest-risk to defer, hence P3 and the final wave.
Accessibility is non-negotiable: every animation must respect
`prefers-reduced-motion`. Avoid layout-thrash animations on large
collection trees — animate `opacity` / `height`, not reflow.

## How to work on this

1. Soft-depends on Items 1-7 being stable — animating mid-migration
   causes rework. Schedule last.
2. `tw-animate-css` (already a dependency) for keyframes; extend
   `lib/useCopyFeedback.ts`; reuse the global transition conventions
   in `main.css`.
3. Wave-3.
