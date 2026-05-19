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

- [x] Add an "Export CSV" action to the Visualize table — serialize
      the analyzed rows/columns to CSV (respect the current sort
      order) and save via the existing download path used by the
      response Body download.
- [x] Add an "Export chart" action — the `MiniChart` is already an
      SVG, so serialize the live `<svg>` to a standalone `.svg` file;
      optionally rasterize to PNG via a canvas. *(SVG shipped; PNG
      rasterization deliberately skipped — see Follow-ups.)*
- [x] Wire both into the Visualize control bar with the #28 `Button`
      primitive; toast on success via the severity-aware toast queue.

## Follow-ups

PNG rasterization (canvas round-trip of the exported SVG) was scoped
out: the Tradeoffs section called it optional and "SVG export alone
may be enough". SVG is vector, theme-baked, and pastes into every
target the parent CEO note named (docs, tickets, image viewers). If a
user specifically needs a raster paste (older Slack composers), a
follow-up can add a PNG option — but it's speculative until asked for.

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
