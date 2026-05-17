# Plan — Collection runner + iteration data + summary

For: `docs/backlog/P2-2026-05-09-171200-collection-runner-iteration-data.md`

## Dependency check

Phase H.1/H.2 (pre/post scripts + QuickJS sandbox) already landed —
`lib/scriptSandbox.ts`, `sendWithScripts` in `lib/sendRequest.ts`,
`ScriptOutcome`/`ScriptAssert` types all exist. Unblocked.

## Architecture

Four pure-ish lib modules + a modal, no store slice (the run is
modal-scoped; a window-event channel opens it, matching the existing
`apilab:open-guides` pattern).

### `lib/iterationData.ts` (new, pure)
`parseIterationData(text)` → `Record<string,string>[]`. Auto-detects:
trimmed leading `[`/`{` → JSON array of objects; else CSV (RFC 4180 —
quoted fields, `""` escape, embedded commas/newlines, first row =
headers). Values coerced to string. Throws on malformed input.

### `lib/collectionRunner.ts` (new)
The run engine. `send` is an injected dependency (defaults to
`sendWithScripts`) so the engine is unit-testable with a fake.
- `RunRequestStatus = pending | firing | pass | fail | error`.
- `runCollection(plan, {send, onProgress, signal})` — builds the flat
  request×iteration work list, fires sequentially (default) or in
  parallel, classifies each: throw/status 0 → `error`; any failed
  assert → `fail`; else `pass`. `onProgress` fires after every status
  change for live UI.
- `summarize(results)` — pure: pass/fail/error counts, assertion
  totals, total elapsed, per-request durations (histogram input).
- `toNewmanJson(plan, results)` — pure: a Newman-JSON-reporter-shaped
  subset (`run.stats`, `run.executions`, `run.timings`, `run.failures`).

### Sandbox — `pm.iterationData` (items 4)
`scriptSandbox.ts`: `ScriptInputState` gains optional
`iterationData`; the preamble adds `pm.iterationData.get(k)` /
`.toObject()`. `sendRequest.ts`: `SendOptions` gains optional
`iterationData`, threaded into both `runScript` calls. The runner
merges each row into the env vars (for `{{var}}` substitution) AND
passes it as `iterationData` (for the `pm.iterationData` accessor) —
Postman's dual semantics.

### UI
- `components/CollectionRunnerModal.tsx` — container: folder name,
  sequential/parallel toggle, iteration-data picker
  (`<input type="file" accept=".csv,.json">` + a paste textarea — no
  bridge needed, files are small), Run button, live progress, summary
  on completion, "Export JSON" button.
- `components/CollectionRunProgress.tsx` — per-request status list
  (presenter).
- `components/CollectionRunSummary.tsx` — summary view: per-request
  duration bars, assertion pass/fail totals, total elapsed (presenter).
- `CollectionRows.tsx` folder context menu — a "Run collection" item
  that dispatches `apilab:run-collection` (CustomEvent, folder id in
  detail). `App.tsx` hosts `<CollectionRunnerModal>` listening for it.
- i18n: `runner.*` keys in `tr.ts` + `en.ts`.

## Reuse (inline audit)

- `sendWithScripts` (`lib/sendRequest.ts`) — REUSE as the per-request
  fire; EXTEND `SendOptions` with `iterationData`.
- `scriptSandbox.ts` `runScript` / `buildPreamble` — EXTEND for
  `pm.iterationData`.
- `collectionItems` tree + `descendantIds` (`store/internal.ts`) —
  REUSE to resolve a folder's requests.
- `ui/context-menu`, `ui/dialog`, `ui/button` — REUSE.
- `responseDownload.ts` download pattern — REUSE shape for the
  Newman-JSON export (Blob + anchor click).
- CSV parser — CREATE (no existing CSV parser; importers are all JSON).

## Edge cases

- Empty iteration data → a single run with one empty row `[{}]`.
- Folder with zero requests → Run button disabled + a notice.
- Parallel mode races rate limits — default sequential; parallel
  documented as opt-in.
- `signal` for cancel — the modal can abort an in-flight run.
- Malformed CSV/JSON → caught, surfaced inline, run not started.

## Tests

- `lib/__tests__/iterationData.test.ts` — CSV quoting / embedded
  commas / JSON array / malformed.
- `lib/__tests__/collectionRunner.test.ts` — status classification,
  summary aggregation, Newman shape, sequential vs parallel (fake
  `send`).
- `lib/__tests__/scriptSandbox` already exists — add an
  `iterationData` case there or a focused test.

## Changelog + version

User-visible (big new feature) → changelog entry + **minor** bump
(0.8.0 → 0.9.0).
