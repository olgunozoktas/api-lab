# History search bar — mirror of the Collections search

Priority: P2
Status: SHIPPED — 2026-05-09

## Status

History tab now has the same SearchInput as Collections — extracted
into `frontend/src/components/ui/search-input.tsx` so both tabs render
the identical UX. Per-tab query state in `Sidebar.tsx`: switching
between Collections and History preserves each tab's filter (felt
nicer than wiping when toggling back and forth).

The smart-prefix detection from the v2 bullets in this file shipped
with v1: `frontend/src/lib/historyFilter.ts` parses the query into
structured filters before matching. Patterns recognized:

- HTTP verb prefix → method exact match (case-insensitive on user
  input, canonical UPPER on item — `post users` matches POST requests
  with "users" in URL).
- 3-digit number 100-599 → status code exact match.
- Remainder → URL substring (case-insensitive).

Combined: `GET 401 login` matches GET requests with status 401 whose
URL contains "login". AND-semantics across all set filters.

Edge cases handled: out-of-range "999" / leading-zero "099" stay
in URL substring (not parsed as status). Second verb stays in URL
substring (only the first verb counts as method). Tests: 18 vitest
specs covering the parser + matcher + filterHistory wrapper.

## Context

Follow-up to commit `bf59e5e` (sidebar search for Collections, shipped
2026-05-09). The search bar lives only in the Collections tab today;
the History tab still requires scrolling through the full request
history to find anything. Symmetric pattern would feel consistent —
both tabs should support the same filter UX.

History entries (`frontend/src/components/HistoryList.tsx`) are
currently a flat chronological list of `HistoryItem` objects with
`{request: RequestSnapshot, response: { status, sizeBytes, elapsedMs }, ts}`.
Filter targets:

- request URL substring (most common)
- HTTP method exact match (GET / POST / etc.)
- status code (e.g. `404` to find errors, `2xx` for successes)
- date / "today" / "this week" (lower priority)

## Items

- [ ] Lift the existing `SearchInput` component out of `Sidebar.tsx`
      into a reusable primitive (`frontend/src/components/ui/search-input.tsx`)
      — same UX as the Collections one but used in two places.
- [ ] Pass a `query` prop to `HistoryList` (mirrors `CollectionList`).
- [ ] HistoryList filter logic: case-insensitive substring match on
      `request.url`. Empty result → localized "No matches" line.
- [ ] (v2) detect when query is purely `2xx`/`3xx`/`4xx`/`5xx` or
      a 3-digit number → filter by `response.status`. Keep regex
      tight; bail out for any non-numeric/non-pattern token.
- [ ] (v2) detect when query starts with a known HTTP verb
      (`GET `/`POST `/`PUT `/`DELETE `…) → filter by method exact.
      Tokens after the verb keep filtering URLs.
- [ ] i18n: reuse `collections.search.placeholder` / `.empty` /
      `.clear` if they fit; otherwise add `history.search.*`.
- [ ] Tests: URL substring, method-prefix detection, status-code
      detection, empty result.

## Acceptance

User opens History tab, types `users` → only entries whose URL
contains "users" remain. Types `GET ` → only GET entries. Types
`401` → only 401-status entries.

## Tradeoffs

- **Shared SearchInput vs duplicate** — extracting the primitive
  removes 30 lines of duplication but adds a new file. Good trade
  for v1; future tabs (env modal? collections modal?) will reuse.
- **Smart prefix detection** vs **multiple input boxes** — multiple
  filter boxes (URL / method / status) is more discoverable but
  visually heavier. Single smart-input is cleaner; v1 ships it.
  If users want explicit method/status pickers, file as v3.
- **Date filter** — punted to a follow-up; "this week" / "today"
  needs a drop-down or quick-button + date math. Not on critical
  path for v1.

## How to work on this

1. Read `frontend/src/components/HistoryList.tsx` for the current
   list shape.
2. Read `frontend/src/components/Sidebar.tsx`'s `SearchInput`
   component — extract verbatim into `ui/search-input.tsx` then
   import in both `Sidebar.tsx` (Collections + new History) sites.
3. Mirror the filter logic from `CollectionList.tsx`'s `useMemo`
   block — simpler since History is flat (no parent walking).
4. For the smart prefix v2 work, write the parsers as pure helpers
   in `frontend/src/lib/historyFilter.ts` (not lib root) — keeps
   logic out of the component for testing.
