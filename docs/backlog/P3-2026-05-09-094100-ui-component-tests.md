# UI component tests via @testing-library/react

Priority: P3

## Context

Phase F (Tests + CI/CD) shipped Vitest unit tests for pure utils + Zig
unit tests for the http handler — but there are NO tests on React leaf
components. As components like `CopyAsMenu` (P2 #2 codegen ship,
2026-05-09), `QuickSwitcher`, and `TabStrip` accumulate behavior
(open/close, keyboard handling, drag-reorder, focus management), the
absence of behavior tests is a growing risk.

## Items

- [ ] Add `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` to dev deps via `dnpm install --save-dev`
- [ ] Configure vitest to use `environment: "jsdom"` for `*.test.tsx` files (keep the `node` environment for pure-util tests — speed)
- [ ] Add a `frontend/src/test/setup.ts` that imports `@testing-library/jest-dom` so `toBeInTheDocument()` etc. work
- [ ] Write `CopyAsMenu.test.tsx` covering: button toggles open, click outside closes, Escape closes, click on item fires `onSelect` + closes, last-copied check icon appears on the picked item
- [ ] Write `QuickSwitcher.test.tsx` covering: ⌘+P opens, fuzzy match ranks substring + sub-sequence, Enter picks the highlighted item
- [ ] Write `TabStrip.test.tsx` covering: middle-click closes a tab, ⌘+W on the active tab closes it (replaces with empty if last)

## Acceptance

`dnpm run test` runs all existing tests + the new component tests
green. `dnpm run typecheck` clean. CI ubuntu-latest job (Node 22 +
vitest) green.

## Tradeoffs

`jsdom` adds ~1 sec to test boot. Mitigated by per-file environment
override (only `*.test.tsx` pays the cost). The alternative
(`happy-dom`) is faster but less compatible with WebKit-leaning
testing patterns.

## How to work on this

Phase F's existing pattern (`vitest.config.ts`) is the starting point.
Reuse the existing CI workflow — it already runs Vitest, just needs
the new test files to exist.