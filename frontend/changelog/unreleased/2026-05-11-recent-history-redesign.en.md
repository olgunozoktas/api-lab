---
title: Cleaner Recent History panel on the empty response pane
date: 2026-05-11
---

The "Recent history" suggestions shown on the empty response pane got
a redesign:

- **Deduplicated** — the same `method + URL` is collapsed into one
  row, with a `×N` badge showing how many times it was sent. No more
  six identical lines of "GET 200 /users/octocat".
- **Status pill** — the response status now uses the same colored pill
  treatment as the response header (2xx green, 4xx orange, 5xx red).
- **Time ago** — each row shows a relative timestamp (`2m`, `3h`,
  `5d`) so you can tell at a glance which one was just sent vs which
  is from last week.
- **Response size** — bytes/KB/MB shown next to the elapsed time.
- **Right-click menu** — same four actions as the sidebar (Replay /
  Open in new tab / Copy URL / Delete).

The Turkish-locale uppercase quirk that turned "RECENT HISTORY" into
"RECENT HİSTORY" (dotted İ) is gone too — the section header now uses
mixed case, no CSS `text-transform`.
