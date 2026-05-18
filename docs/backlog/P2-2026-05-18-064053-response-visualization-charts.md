# Frontend upgrade 7/9 — Response visualization: charts & tables from JSON

GitHub Issue: [#33](https://github.com/olgunozoktas/api-lab/issues/33)

Priority: P2

## Context

Part of the 9-item frontend-view-upgrade initiative (2026-05-18
handoff). The competitor research found one genuine *feature* gap
(not just polish): every modern API client — Postman's visualizer
most prominently — can turn a JSON response into a table or chart.
API Lab renders JSON as a tree and text only. This item adds a
"Visualize" surface to the response viewer. (Explicitly added as the
9th item at the user's request during planning.)

## Items

- [ ] Add a "Visualize" view / tab to `ResponseViewer.tsx` — detect
      chartable JSON (arrays of objects, numeric series) and render a
      table view plus a bar / line chart.
- [ ] Pick a charting approach — evaluate a tiny dependency vs.
      hand-rolled SVG; prefer no-heavy-dependency / hand-rolled to
      match the project's posture (markdown, hexdump, JSON highlight
      and the LCS diff are all hand-rolled).
- [ ] **Lazy-load** the visualization code-split — mirror the
      `RedocPane` / `PdfViewer` / Spectral lazy-import pattern so it
      never enters the first-paint bundle.
- [ ] Graceful fallback / clear empty state when the response isn't
      chartable (non-array, non-numeric).
- [ ] Reuse the Item-2 primitives for the surface chrome.

## Acceptance

A JSON array-of-objects response renders as a sortable table and a
bar/line chart in the Visualize view; a non-chartable response shows
a clear "not visualizable" state; the viz code is in a lazy chunk —
first-paint bundle stays under the 1650 KB guardrail.

## Tradeoffs

If a charting library is chosen it must be tiny and lazy-loaded; the
project's posture favours hand-rolled SVG over heavy deps. This is a
net-new feature, not pure polish — scoped into the initiative at the
user's explicit request. `ResponseBody.tsx` is near the 400-LOC cap:
add the viz as a sibling component, never inline.

## How to work on this

1. The response viewer already has a tab system (`body / headers /
   raw / tests / console / examples`) — add `visualize` alongside.
2. Lazy-import pattern: see `App.tsx`'s `lazy(() => import(
   "./components/OpenApiEditor"))` and `ResponseBinaryBody`.
3. Wave-2 — independent of Items 1/3, benefits from Item 2.
