---
title: Visualize JSON responses as tables and charts
date: 2026-05-18
---

The response viewer gains a **Visualize** tab. When a response is a
JSON array — either an array of objects or a plain list of numbers —
API Lab turns it into a **sortable table** and a **bar or line
chart** without leaving the app.

- Click any column header in the table to sort by it; click again to
  flip the direction.
- Switch to the chart, pick which numeric column to plot, and toggle
  between a bar and a line chart.
- Responses that aren't arrays show a clear "can't be visualized"
  message explaining why.

The charts are hand-drawn SVG — no charting library — and the whole
Visualize view loads on demand, so it never weighs down the app's
first paint.
