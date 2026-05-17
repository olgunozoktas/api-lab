---
title: Run a whole collection with data-driven iterations
date: 2026-05-17
---

API Lab gains a **collection runner**. Right-click any folder in the
sidebar and choose **Run collection** — every request in the folder
(and its sub-folders) fires in order, with a live pass/fail status per
call.

**Data-driven runs.** Point the runner at a CSV or JSON file (or paste
it inline) and the whole collection runs once per row. Each row's
columns become variables: `{{userId}}` in a URL resolves to that
row's value, and scripts can read the row via `pm.iterationData.get()`.
Run 10 requests against a 5-row CSV and you get 50 calls.

**Status at a glance.** Every call is marked pass (all assertions
green), fail (an assertion red), or error (network or script crash).
When the run finishes you get a summary: requests passed/failed,
total assertions, total time, and an average-duration bar per request.

**Sequential or parallel.** Sequential is the default — it's gentle on
rate limits. Parallel fires everything at once when you need speed.

**Export.** One click exports the run as a Newman-shaped JSON report,
so it drops into existing Postman/Newman tooling.
