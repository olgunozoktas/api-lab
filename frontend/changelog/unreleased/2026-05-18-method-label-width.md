---
title: Fix DELETE method label overlapping request names
date: 2026-05-18
---

In the Collections sidebar, History list, and the recent-history
cards, the `DELETE` method label was wider than its fixed column and
ran straight into the request name next to it — "DELETEDelete
customer" with no gap. The method column is now wide enough for the
longest method name, so every label sits cleanly in its own space.
