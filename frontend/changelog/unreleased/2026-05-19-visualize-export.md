---
title: Export the Visualize table and chart
date: 2026-05-19
---

The response **Visualize** view is no longer a dead end. Both the
table and the chart now have an **Export** button in the control bar:

- In **table** view, *Export CSV* downloads the analyzed rows as a
  `.csv` — in the exact sort order you're looking at, RFC 4180-quoted
  so it opens cleanly in Excel, Numbers, or any spreadsheet.
- In **chart** view, *Export chart* downloads the bar / line chart as
  a standalone `.svg`. Colours are baked in, so the file looks right
  wherever you open it — a doc, a ticket, an image viewer.

Each export confirms with a success toast. Turn an API response into a
chart, then take it with you.
