# E2E follow-up — DOM-level rendering assertions

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-082819-e2e-zero-native-automation.md`
(shipped 2026-05-17 in `feat/e2e-zero-native-automation`). That slice
landed an E2E harness (`scripts/e2e/run.sh`) that drives the app via
zero-native's file-based automation protocol and asserts the
`http.request` **bridge response**.

The original items 3 & 4 asked to "assert the response renders in the
Body tab" and "assert the error UI shows" — i.e. **DOM-level**
assertions. The research spike found this is not possible today:
zero-native's automation snapshot (`src/automation/snapshot.zig`) is
**window-granularity only** — title, bounds, focus, and an a11y tree
at window level. There is no DOM introspection surface.

CEO lens: bridge-response assertions prove the Zig half of the seam,
but a refactor of the React rendering layer (ResponseViewer, Body
tab) could regress without any E2E catching it. The DOM assertion
closes that gap. Eng lens: this is blocked on upstream — it needs
zero-native to grow a DOM-introspection surface in its automation
snapshot (e.g. a queryable accessibility tree at element granularity,
or a `dom` automation command that returns serialized node text).

## Items

- [ ] Check zero-native upstream for a DOM-introspection surface —
      whether the automation snapshot has grown element-level a11y or
      a `dom` query command since 2026-05-17. File an upstream issue
      if not.
- [ ] If a surface exists, extend `scripts/e2e/run.sh` with a case
      that sends `http.request` via the JS bridge and asserts the
      response text appears in the rendered Body tab.
- [ ] Add an error-path DOM case — assert the error UI surfaces the
      curl exit code + stderr to the user.

## Acceptance

At least one E2E case asserts rendered DOM content (not just the
bridge-response artifact). Runs green in the macOS CI job.

## Tradeoffs

- **Blocked on upstream.** Until zero-native exposes DOM
  introspection, this cannot ship — do not start until the first
  item confirms a surface exists.
- DOM selectors are flakier than JSON artifact assertions; keep the
  assertion coarse (substring of expected text in the a11y tree)
  rather than brittle element-path matching.

## How to work on this

1. Start with the upstream check — read the current
   `~/Herd/zero-native/src/automation/` for any new DOM surface.
2. Only if one exists, extend the existing harness — the
   `run_case` rig already generalizes per command.
