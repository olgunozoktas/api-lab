---
title: Collection runner — bounded concurrency in parallel mode
date: 2026-05-21
---

Parallel mode used to fire **every** (request × iteration) cell at
once via a single `Promise.all`. For a 10-request collection against
a 50-row CSV that was 500 concurrent curl subprocesses — enough to
exhaust file descriptors, trip API rate limits hard, or wedge the
machine.

Parallel runs now use a bounded **6-worker pool** (same default
Chrome uses for per-origin connection limits). 500 cells still run
in roughly the same wall-clock time as before for any API that
doesn't immediately reject the burst — but no more than 6 are ever
in flight at once. Cancellation drains in-flight work without
firing further cells.

The 6-worker cap is fixed for v1. A user-tunable input is queued
as a follow-up if anyone asks. Sequential mode (the default) is
unchanged.
