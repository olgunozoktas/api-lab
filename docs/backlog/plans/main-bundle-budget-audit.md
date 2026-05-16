# Plan — Main bundle budget audit

For: docs/backlog/P3-2026-05-16-074500-main-bundle-budget-audit.md

## Discovery (reframes the task)

CI is **red on `main`** — and the failing step is the existing
`scripts/check-bundle-size.sh` guardrail, wired into `.github/workflows/ci.yml`.
It sums **every** `dist/assets/*.js` file and checks the total against
`MAX_JS_GZ_KB=480`. The binary-bridge ship added a 122 KB-gz lazy
`PdfViewer` chunk, pushing total JS gz to 623 — over the cap.

The check has the wrong metric: a lazy chunk that the user only
downloads on demand (PdfViewer, the OpenAPI editor) should not count
against the *initial-load* budget. The current script actively
penalises correct code-splitting — every time you split a chunk out,
"total JS" stays flat or grows (chunk overhead) and you get no credit.

So the audit's real deliverable: **budget the entry chunk, not the
sum.**

## Architecture

- **Slice A — rewrite `scripts/check-bundle-size.sh`** to budget the
  Vite entry chunk (`dist/assets/index-*.js`) — the true initial
  download — plus CSS. Lazy chunks are listed informationally with a
  generous per-chunk safety ceiling (catches a runaway lazy chunk
  without penalising splitting). This is the CI-green fix.
- **Slice B — lazy-load `ResponseBinaryBody`** (backlog item 4):
  binary responses are a rare path, so the image/audio/video/pdf
  viewer dispatch belongs behind a dynamic import, trimming the entry
  chunk. Item 3 ("find the next split candidate") is satisfied by the
  audit conclusion below.

### Lazy-split audit (item 3)

- `ResponseBinaryBody` — **split** (Slice B). Rare path.
- `@uiw/react-json-view` — **do NOT split.** JSON is the most common
  response type; lazy-loading it would flash a chunk-load on the
  commonest path.
- CodeMirror, React, zustand, lucide, Radix — irreducible core, on
  first paint.
- QuickJS — already a separate `.wasm` asset.
- `ChangelogModal` / `GuideHub` — genuine future candidate (modals,
  opened rarely, and they glob-import all the markdown content). Out
  of scope here; queued as a Step 8 follow-up.

## Thresholds (with headroom)

- Entry chunk: `MAX_ENTRY_GZ_KB=510` (current `index-*.js` ≈ 480 gz),
  `MAX_ENTRY_RAW_KB=1650` (current ≈ 1537).
- CSS: keep `80` raw / `15` gz (current ≈ 65 / 11).
- Per-lazy-chunk safety ceiling: `MAX_LAZY_CHUNK_GZ_KB=600`
  (PdfViewer is 122 — wide berth; catches a runaway).

## Edge cases

- Exactly one `index-*.js` must exist — error clearly if zero or many.
- `.mjs` worker assets (`pdf.worker.min-*.mjs`) are not `.js` — not
  counted; correct (the worker loads only with a PDF).

## Risks

- Lazy-loading `ResponseBinaryBody` adds a Suspense boundary in
  `ResponseBody`; the fallback must not flicker for the common
  (non-binary) path — the dynamic import is reached only when
  `bodyBase64`/`bodyTooLarge` is set.

## Tests

- Slice A: run the rewritten script against a real `dist/` — must
  pass with the entry-chunk metric and fail if thresholds are dropped.
- Slice B: `tsc --noEmit` + vitest + `vite build`; confirm
  `ResponseBinaryBody` lands in its own chunk and the entry chunk
  shrinks.

## Reuse audit (inline)

- `check-bundle-size.sh` — EXTEND/REWRITE the existing script; do not
  add a parallel one. It is already CI-wired.
- `lazy()` + `Suspense` — REUSE the pattern already in
  `ResponseBinaryBody.tsx` (it lazy-loads `PdfViewer`).
- No new dependency — no `rollup-plugin-visualizer`; the Vite build
  output + the rewritten script are sufficient measurement.
