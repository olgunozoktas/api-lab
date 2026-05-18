# Visualize — export table as CSV, chart as image

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-18-064053-response-visualization-charts.md`
(shipped 2026-05-18, #33). The Step 8 CEO ultrathink flagged the
share-story gap: a user who turns an API response into a table or
chart almost always wants to put that artifact somewhere — a doc, a
Slack message, a ticket. Right now the Visualize view is a dead end —
you can look, but you can't take it with you.

## Items

- [ ] Add an "Export CSV" action to the Visualize table — serialize
      the analyzed rows/columns to CSV (respect the current sort
      order) and save via the existing download path used by the
      response Body download.
- [ ] Add an "Export chart" action — the `MiniChart` is already an
      SVG, so serialize the live `<svg>` to a standalone `.svg` file;
      optionally rasterize to PNG via a canvas.
- [ ] Wire both into the Visualize control bar with the #28 `Button`
      primitive; toast on success via the severity-aware toast queue.

## Acceptance

From the Visualize tab, the user can download the current table as a
`.csv` and the current chart as an image, with a success toast for
each.

## Tradeoffs

CSV is trivial and pure (testable in `chartable.ts` or a sibling
`lib/` helper). PNG rasterization needs a canvas round-trip — keep it
optional; SVG export alone may be enough. Match the existing
response-body download UX so there's no new save mechanism.

## How to work on this

1. The response Body tab already has a download-to-disk path
   (`response.download.body`) — reuse its file-save mechanism.
2. CSV serialization belongs in a pure helper next to `chartable.ts`
   so it can be unit-tested without the DOM.
