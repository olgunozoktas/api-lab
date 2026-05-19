---
title: Consistent empty states across the app
date: 2026-05-19
---

Every "nothing here" surface now renders through the same `EmptyState`
template, so an empty Visualize view, a no-results search, an unbuilt
diff, and an empty collection runner all look like one app instead of
nine slightly different ad-hoc layouts.

A new **compact** size keeps dense inline "no results" hints — the
collection / history / response-header / guide searches — quiet and
small, while first-impression surfaces keep the full icon-and-title
treatment.
