# Adopt the EmptyState primitive across remaining ad-hoc empty states

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-18-064052-rich-empty-states-onboarding.md`
(shipped 2026-05-18, #32). That slice introduced
`frontend/src/components/ui/empty-state.tsx` and rebuilt five empty
surfaces on it. But several other "nothing here" states still render
their own ad-hoc JSX and now look inconsistent next to the rich ones:

- `ResponseVisualize.tsx` — the "not-visualizable" state (shipped in
  #33, before this primitive existed).
- The `collections.search.empty` no-results blocks in
  `CollectionList.tsx`, `HistoryList.tsx`, and the response Headers
  search in `ResponseBody.tsx`.
- Any other centered "no X" message a sweep turns up.

## Items

- [ ] Fold `ResponseVisualize`'s `NotVisualizable` onto `EmptyState`.
- [ ] Fold the search-empty / no-results blocks onto `EmptyState`
      (smaller padding variant — they sit inside scroll areas).
- [ ] Sweep `frontend/src/components/` for any remaining centered
      empty messages and convert or consciously leave them.

## Acceptance

Every "nothing here" surface in the app renders through `EmptyState`,
or is explicitly noted as intentionally different.

## Tradeoffs

Search-empty states are denser than first-impression empty states —
`EmptyState` may need a `compact`/`size` variant rather than forcing
the full icon-circle treatment everywhere. Decide during the slice;
don't bloat the primitive if a `className` override is enough.

## How to work on this

1. `EmptyState` already accepts `className` — try that before adding a
   variant prop.
2. Pure refactor — no behaviour change, so no changelog entry needed
   unless the visual delta is user-noticeable (it will be — treat as
   a polish entry).
