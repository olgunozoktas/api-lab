---
title: Filter the response Headers tab
date: 2026-05-11
---

The **Headers** tab now has a filter input at the top. Type `cache`,
`cors`, `x-` or any other substring — matches against both the
header name AND its value — and the table narrows to just those
rows. Useful when a CDN response carries 30+ headers and you need to
spot a single `cache-control` directive or `access-control-*` rule
fast.

The filter is per-tab (resets on tab change) and only narrows what
you see — the underlying response is untouched.
