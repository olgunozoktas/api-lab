---
title: Collection runner — click-to-expand failure detail + Re-run failed
date: 2026-05-21
---

Two upgrades land in the collection runner modal:

**Click any failed or errored cell to expand its detail panel.** The
panel lists each failing assertion (name + message) and surfaces any
engine-level error (script crash, network error) along with the
response status. Passed assertions collapse to a one-line tally so
the surface stays focused on what failed. Multiple rows can be
expanded at once — handy when two cells fail for the same underlying
reason and you want to read them side by side.

**Re-run failed.** When a run finishes with failures, a new
**Re-run failed (N)** button appears next to Export JSON. Clicking
it fires *only* the failed / errored cells through the engine
again. Previously-passed cells stay visible + green, the targeted
cells go pending → firing → pass/fail/error in place — the
re-run reads as a continuation of the same run, not a fresh
start. Pair it with the click-to-expand detail to see "here's
what failed" → edit your request or script → "did it pass?" in
a tight loop.

Engine-side, `RunPlan` gains an optional `workList` field —
`{requestId, iteration}` pairs that override the default
`requests × rows` cross-product. Unknown ids or out-of-range
iterations are silently skipped (recoverable shape mismatch, not
a crash). Two new unit tests pin the workList behaviour.
