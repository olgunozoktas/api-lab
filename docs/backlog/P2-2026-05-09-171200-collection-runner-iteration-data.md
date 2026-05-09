# Phase H.3 — Collection runner + iteration data + summary view

Priority: P2

## Context

Postman's collection runner: pick a folder, fire every request in
sequence (or parallel), see pass/fail per assertion, summary table.
Drives data-driven testing via CSV/JSON iteration files.

## Items

- [ ] "Run collection" entry in folder/collection right-click context menu
- [ ] Runner UI: select folder, sequential / parallel mode, iteration data picker (CSV / JSON), run button, live progress
- [ ] Per-request status: pending / firing / pass (all asserts green) / fail (any assert red) / error (network/script crash)
- [ ] Per-iteration variables: `pm.iterationData` available inside scripts (one row per iteration, all requests run with that row's vars)
- [ ] Summary view at end: per-request duration histogram, total assertions pass/fail, total elapsed
- [ ] Export run results as JSON (Newman-compatible reporter shape)

## Acceptance

User runs a collection of 10 requests against a CSV with 5 rows
(50 calls total), sees green/red status per call, gets a summary
showing 47 passed / 3 failed assertions across 5.2 seconds total.

## Tradeoffs

Parallel mode races against API rate limits; default to sequential.
Iteration data parsing supports CSV (RFC 4180) + JSON arrays only;
no Excel.

## How to work on this

1. Phase H.1 + H.2 MUST land first.
2. Reuse `lib/sendRequest.ts:send` for each request; thread
   iteration vars into the env merge step.
3. Newman reporter shape:
   https://github.com/postmanlabs/newman/blob/develop/lib/reporters/json/index.js
