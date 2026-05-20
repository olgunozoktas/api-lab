---
title: "Compare with…" entries in history + tab context menus
date: 2026-05-21
---

The response diff modal used to be reachable only from the **TopBar
→ Compare responses** button, and it always opened with both sides
unpicked. Two new context-menu entry points fix that:

- **History list** — right-click any entry with a retained body and
  pick *Compare with…* The diff modal opens with that entry pre-
  selected on the left; the right side stays at the default
  fallback so you can pick the comparison target.
- **Tab strip** — right-click any tab whose last response has a
  text body (binary / over-budget responses are excluded since the
  diff can't read them) and pick *Compare response with…* Same
  pre-seed behavior, with the tab's response as the left source.

If the pre-seeded source has vanished by the time the modal opens
(history trimmed, tab closed), the modal silently falls back to the
default `sources[0]` pick — no error, no broken state.

Behind the scenes: a new `apilab:open-diff` window event ties the
context menus to the TopBar's modal without prop-drilling through
the whole tree.
