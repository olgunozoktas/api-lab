# Collection runner — bounded concurrency for parallel mode

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-171200-collection-runner-iteration-data.md`
(shipped 2026-05-17 as v0.9.0). Parallel mode currently fires *every*
(request × iteration) cell at once via a single `Promise.all`. For a
10-request collection against a 50-row CSV that's 500 concurrent curl
subprocesses — enough to exhaust file descriptors, trip API rate
limits hard, or wedge the machine.

CEO + Eng lens (both agree): sequential is the safe default (and is
the default), but anyone who picks parallel for speed shouldn't be
able to accidentally DoS themselves or the target API. A bounded
worker pool (default ~6 in flight) keeps parallel fast without the
footgun.

## Items

- [x] Add a concurrency limit to `runCollection`'s parallel path — a
      simple N-worker pool draining the work queue instead of one
      `Promise.all` over every cell.
- [x] Surface the limit (default 6) — a small number input next to
      the parallel toggle, or a sensible fixed cap documented in the
      UI hint.
- [x] Unit-test that no more than N sends are ever in flight at once
      (instrument the fake `send`).

## Acceptance

A parallel run of 500 cells never has more than the configured number
of requests in flight simultaneously.

## Tradeoffs

- A fixed cap is simplest; a user-tunable input is friendlier but adds
  UI. Default to a fixed 6 with a follow-up if users ask to tune it.

## How to work on this

1. Replace the parallel `Promise.all(work.map(...))` with a worker
   pool that pulls indices off a shared cursor.
2. The fake-`send` test rig already exists in
   `collectionRunner.test.ts` — add an in-flight counter.
