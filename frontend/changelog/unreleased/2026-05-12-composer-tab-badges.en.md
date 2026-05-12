---
title: Every composer tab now shows a content indicator
date: 2026-05-12
---

Params and Headers already showed a count pill when populated; now
the rest of the composer tabs carry an at-a-glance indicator too:

- **Auth** — shows the active auth type ("Bearer", "Basic", "Key",
  "OAuth") when something other than None is selected.
- **Body** — shows the active body mode ("JSON", "Form", "Raw") when
  the body isn't None.
- **GraphQL** — shows a small dot when a query is present.
- **Scripts** — shows 1 or 2 depending on whether the pre-request
  and/or post-response script blocks have content.

You can now glance at the tab strip and tell which tabs carry hidden
state without clicking through each one.
