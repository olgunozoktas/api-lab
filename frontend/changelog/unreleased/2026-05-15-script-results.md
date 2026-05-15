---
title: See test results and console output from pre/post-request scripts
date: 2026-05-15
---

Pre/post-request scripts now report back. After a request runs, the
response area has two new tabs:

- **Tests** — every `pm.test(...)` assertion from your scripts,
  green PASS or red FAIL, with the failure message inline. A script
  that threw is flagged at the top so a half-run isn't mistaken for
  a clean pass.
- **Console** — everything your script `console.log`'d (and
  `console.error` / `console.warn`), in order.

Both tabs carry a count badge so you can see at a glance how many
tests ran and whether anything was logged.

The chai-style assertion library also gained `pm.expect(x).to.be.a(
"string")` / `.an("array")` type checks alongside the existing
`equal`, `eql`, `have.property`, `match`, `include`, and the rest.

The scripting sandbox, the Scripts editor tab, and the assertion
engine already shipped — this connects their output to the UI so
you can actually see what your scripts did.
