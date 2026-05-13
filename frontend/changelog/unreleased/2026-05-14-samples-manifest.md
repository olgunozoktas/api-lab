---
title: Built-in sample request manifest (data layer)
date: 2026-05-14
---

Lays the groundwork for a starter "Samples" surface so a fresh user no
longer faces an empty composer on first launch. This slice ships the
**data layer only** — six built-in samples (HTTP GET, HTTP POST,
GraphQL Countries, WebSocket Echo, SSE Tick, gRPC Reflection) live in
`frontend/src/lib/samples.ts` with i18n keys for every name +
description.

The rendering, hide/show controls, and "always reach" surfaces ship in
follow-up slices (P2 backlog item #26). After this slice, nothing is
user-visible yet — but the manifest is testable in isolation, every
URL has been hand-picked from stable public test services, and 12 new
Vitest cases cover shape + uniqueness + i18n parity.
