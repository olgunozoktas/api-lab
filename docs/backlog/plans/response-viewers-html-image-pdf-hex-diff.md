# Plan — Response diff (final item of Phase E.3)

For: `docs/backlog/P2-2026-05-09-170900-response-viewers-html-image-pdf-hex-diff.md`

## Scope

The last unchecked item: **Response diff** — pick two sources, render a
side-by-side diff. User chose the larger scope: persist response bodies
into history first so history-to-history diff works (not just tab-to-tab).

## Slice 1 — History body persistence

`HistoryItem.response` today carries only `{status, sizeBytes, elapsedMs}`.
Widen it (all new fields **optional** — old v3 persisted entries stay
valid, so no schema-version bump / migration is needed):

```ts
response: {
  status; sizeBytes; elapsedMs;
  body?: string;          // retained text body, for diffing
  contentType?: string;   // present iff body is
  bodyOmitted?: "too-large" | "binary" | "budget";
}
```

`lib/historyBody.ts` (new, pure):
- `HISTORY_BODY_MAX_BYTES = 256 KiB` — per-entry hard cap.
- `HISTORY_BODY_BUDGET_BYTES = 2 MiB` — total retained-body budget.
- `extractRetainableBody(r)` — binary (`bodyBase64`/`bodyTooLarge`) →
  `bodyOmitted:"binary"`; over per-entry cap → `"too-large"`; else
  `{body, contentType}`.
- `applyBodyBudget(items)` — walk newest→oldest, sum retained body
  bytes; past the budget, strip `body` + mark `bodyOmitted:"budget"`.
  Keeps the persisted IDB blob bounded regardless of the 200-entry cap.

`store/history.ts` — `pushHistory(snap, response: ResponseSnapshot)`
(was 4 scalar args); builds the item via `extractRetainableBody`, then
`applyBodyBudget` on the new list. `App.tsx` caller updated.

## Slice 2 — Diff engine

`lib/responseDiff.ts` (new, pure):
- `prepareDiffBody(body, contentType)` — JSON → `JSON.parse` +
  `JSON.stringify` with **sorted keys**, 2-space indent (order-
  independent diff); non-JSON / parse-fail → raw text.
- `diffLines(a, b)` — LCS line diff → `{ rows: DiffPair[]; truncated }`.
  `DiffPair = {kind:"equal"|"add"|"remove"; left:Cell|null; right:Cell|null}`.
  Caps each side at `MAX_DIFF_LINES = 1500` (DP table stays small);
  `truncated` flag drives a UI notice.

## Slice 3 — Diff UI

- `components/ResponseDiff.tsx` — pure presenter: side-by-side two-
  column rows with line numbers + add/remove coloring.
- `components/ResponseDiffModal.tsx` — container: reads `tabs` +
  `history`, builds `DiffSource[]` (open tabs with a response +
  history entries with a retained body; binary → non-diffable
  placeholder), two `Select`s for left/right, hosts `<ResponseDiff>`.
- `TopBar.tsx` — `GitCompare` icon button + open state + modal mount.
- i18n: new `diff.*` + `topbar.diff` keys in `tr.ts` (source) + `en.ts`.

## Reuse

- `ui/dialog`, `ui/select` — existing primitives (ChangelogModal /
  TopBar pattern). REUSE.
- `isProbablyJson` (`lib/utils`) — REUSE for the JSON-detect branch.
- LCS line diff — no dependency added (the backlog suggested
  `diff-match-patch`/`microdiff`; a ~40-line LCS is smaller than the
  supply-chain surface and matches the project's hand-rolled-lib
  posture: `markdown.ts`, `hexDump.ts`, `syntaxHighlight.ts`).

## Changelog + version

User-visible (new modal + feature) → changelog entry under
`frontend/changelog/unreleased/` + **minor** bump (0.7.0 → 0.8.0; new
modal surface per the bump policy).

## Tests

- `lib/__tests__/historyBody.test.ts` — budget walk, per-entry cap,
  binary omission.
- `lib/__tests__/responseDiff.test.ts` — equal/add/remove, JSON key
  reorder normalizes, value change shows, truncation.

## Verification

`dnpm run typecheck` + `dnpm run test` + `dnpm run build` green;
`./build.sh` → TopBar diff button opens the modal, picking two tab
responses renders the diff.
