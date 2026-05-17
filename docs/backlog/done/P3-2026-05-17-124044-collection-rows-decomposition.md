# Decompose CollectionRows.tsx — it sits exactly at the 400-line cap

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-171200-collection-runner-iteration-data.md`
(shipped 2026-05-17). Adding the "Run collection" context-menu entry
pushed `frontend/src/components/CollectionRows.tsx` to **exactly 400
lines** — the CLAUDE.md hard cap. The ship trimmed its own additions
to land at 400 rather than over, but the file now has **zero
headroom**: the next edit, however small, breaks the hard rule and
the reviewer must reject it.

Eng lens (CEO-neutral — this is pure code-health debt, surfaced
honestly rather than silently left): the file holds two sibling row
components — `FolderRow` and `RequestRow` — plus their context menus.
That's a natural seam. Splitting them into `FolderRow.tsx` +
`RequestRow.tsx` (and keeping `CollectionRows.tsx` as the thin
list/dispatch shell) restores headroom and matches the project's
"extract subcomponents" decomposition guidance.

## Items

- [x] Extract `FolderRow` into `components/CollectionFolderRow.tsx`.
- [x] Extract `RequestRow` into `components/CollectionRequestRow.tsx`.
- [x] `CollectionRows.tsx` keeps only the list shell + the row-kind
      dispatch; confirm all three files land comfortably under 400.
- [x] No behaviour change — pure structural refactor (no changelog
      entry, no version bump).

## Acceptance

`CollectionRows.tsx`, `CollectionFolderRow.tsx`, and
`CollectionRequestRow.tsx` are each well under 400 lines; the sidebar
collection tree behaves identically.

## Tradeoffs

- Shared helpers (drag-and-drop handlers, rename state) may need to
  move to a small `lib/` helper or be duplicated minimally — prefer
  extracting the shared bits over prop-drilling a giant context.

## How to work on this

1. Pure refactor — lean on the existing component tests
   (`store/__tests__/collectionItems.test.ts` exercises the store
   side) and a visual check of the sidebar tree.
