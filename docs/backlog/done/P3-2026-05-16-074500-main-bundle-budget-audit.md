# Main bundle budget audit — back away from the 480 KB-gz ceiling

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-16-071035-binary-response-body-bridge.md`
(shipped 2026-05-16). After the binary-viewer slice landed, the main
bundle measured **479.64 KB gz** (`dist/assets/index-*.js`) — the
previous session's handoff recorded a ~480 KB-gz working ceiling and
a 472 KB-gz baseline. The binary channel added ~7.6 KB to the main
chunk; pdfjs itself was correctly lazy-split (411 KB in its own
`PdfViewer-*.js` chunk), but `binaryBody.ts` + `ResponseBinaryBody`
ride in the main bundle because `sendRequest` (core path) imports the
decode helpers.

The bundle is now ~0.4 KB under the informal ceiling — effectively
breached. The next small feature will push the main chunk over, and
"lazy-load discipline kept us under 480" stops being true.

## Items

- [x] Measure where the main bundle's weight sits — `vite build`
  with `rolldownOptions` chunk analysis, or `rollup-plugin-visualizer`,
  to get a treemap of `index-*.js`.
- [x] Decide a real budget + enforce it — add a `chunkSizeWarningLimit`
  or a CI assertion on the gzipped `index-*.js` size so a regression
  fails the build instead of silently creeping.
- [x] Find the next lazy-split candidate — the OpenAPI editor already
  splits (`openapi-*.js`, 102 KB); audit whether the QuickJS script
  sandbox wasm, `@uiw/react-json-view`, or other heavy leaves can move
  behind a dynamic import or route-level split.
- [x] If `ResponseBinaryBody` can be lazy-loaded from `ResponseBody`
  without hurting the common path, do it — binary responses are rare.

## Acceptance

The main `index-*.js` chunk has measurable headroom under an
explicitly-documented budget, and a build-time check fails if a future
change regresses past it.

## Tradeoffs

- Over-splitting hurts first-paint (more requests). The app loads from
  `zero://app` (local assets), so request latency is near-zero —
  splitting is cheaper here than on the web.
- A hard CI size gate can be noisy; pick a budget with ~10% headroom.

## How to work on this

1. `dnpm run build` already prints per-chunk gzip sizes — start there.
2. Add `rollup-plugin-visualizer` (dev-only) for the treemap, or use
   Rolldown's built-in chunk analysis.
3. The 400-line-per-file rule means most leaves are already small —
   the weight is in dependencies, not app code.
