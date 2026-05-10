---
title: Store internals split per slice
date: 2026-05-10
---

Internal refactor (no user-visible delta) — `frontend/src/store/index.ts`
was 643 LOC, well over the project's 400-LOC hard cap. Split into
eight per-domain slice files via Zustand's slice-composition pattern.
`index.ts` is now an 80-LOC thin composition root.

User persisted state (collections, environments, history, tabs,
preferences) is unaffected — the persist contract was preserved
verbatim. No migration required; the v3 snapshot loads identically
across the upgrade.
