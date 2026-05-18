# Visualize — detect envelope-wrapped arrays

Priority: P2

## Context

Follow-up to `docs/backlog/done/P2-2026-05-18-064053-response-visualization-charts.md`
(shipped 2026-05-18, #33). After the Visualize view landed, the Step 8
CEO + Eng ultrathink surfaced its biggest real-world gap.

`analyzeResponse` in `frontend/src/lib/chartable.ts` only recognizes a
**top-level** JSON array. But a large fraction of real APIs wrap their
list in an envelope object — `{"data": [...]}`, `{"results": [...]}`,
`{"items": [...]}`, `{"rows": [...]}`, pagination wrappers, JSON:API
`{"data": [...]}`. For every one of those, the new Visualize tab shows
"not visualizable (not a JSON array)" even though the response is
perfectly chartable one level down. The feature misfires on the most
common shape it will ever see.

## Items

- [x] In `analyzeResponse`, when the parsed body is a non-array object,
      look for a single array-valued property — or the first match
      among a known key list (`data`, `results`, `items`, `rows`,
      `records`, `list`) — and analyze that array instead.
- [x] Surface which path was unwrapped in the Visualize UI (e.g. a
      small "showing `data[]`" hint) so the user knows the table isn't
      the whole response.
- [x] If multiple array properties exist, prefer the known-key match;
      fall back to the longest array. Document the precedence.
- [x] Extend `chartable.test.ts` — enveloped arrays, JSON:API shape,
      multiple-array tie-break, nothing-array-valued (still
      not-chartable).

## Acceptance

A response of `{"data": [{...}, {...}]}` renders in the Visualize tab
as a table + chart of `data`, with a hint showing the unwrapped path.
A response with no array property anywhere still shows the
"not visualizable" state.

## Tradeoffs

Keep the unwrap shallow — one level only. Deep search invites
ambiguity ("which nested array did the user mean?") and is better
served by an explicit path picker if ever needed. The known-key list
is a heuristic; document it and keep it small.

## How to work on this

1. `analyzeResponse` is pure and well-tested — extend it, don't fork.
   Add the unwrap step between the `JSON.parse` and the
   `Array.isArray` check.
2. The unwrapped-path hint needs an i18n key + a slot in
   `ResponseVisualize.tsx`'s control bar.
