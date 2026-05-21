# React component test stack — testing-library + jsdom for ui/ primitives

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-18-064048-ui-primitive-library.md`
(shipped 2026-05-18). That slice added five primitives under
`frontend/src/components/ui/` (tooltip, badge, skeleton, spinner,
popover). Vitest currently runs in a pure-`node` environment
(`frontend/vitest.config.ts`) with no DOM — so the only coverage the
new primitives got is on their pure `cva` variant functions
(`badgeVariants`, `spinnerVariants`) and the `methodBadgeTone` /
`statusBadgeTone` mapping helpers.

The Radix-wrapped components themselves — `<Tooltip>`, `<TooltipContent>`,
`<PopoverContent>`, `<Skeleton>` — have **zero render-level coverage**:
no test exercises open/close state, portal mounting, `forwardRef`
wiring, ARIA attributes, or `className` merge precedence. As the `ui/`
library grows (Wave-2 items #30–#35 all consume these), an Eng + CEO
review agreed render coverage stops being optional.

## Items

- [x] `dnpm install -D @testing-library/react @testing-library/dom jsdom`
      — then `dnpm check`.
- [x] Switch `frontend/vitest.config.ts` to `environment: "jsdom"` (the
      file's own comment already anticipates this: "If we ever test a
      Zustand store or a hook, switch `environment` to jsdom").
- [x] Add a test setup file if needed (`@testing-library/jest-dom`
      matchers optional — decide during the slice).
- [x] Write render tests for `ui/tooltip.tsx`, `ui/popover.tsx`,
      `ui/skeleton.tsx` — open/close, portal content, `forwardRef`
      reaches the DOM node, `className` merges.
- [x] Verify the existing 618 pure-logic tests still pass under the
      jsdom environment (jsdom is a superset — should be a no-op, but
      confirm: some tests stub `indexedDB`/`localStorage`).

## Acceptance

`vitest` runs under jsdom; `.test.tsx` render tests exist for the
Radix-wrapped primitives; the full suite stays green; `dnpm check`
passes after the new dev dependencies install.

## Tradeoffs

Adds three dev dependencies (supply-chain surface — all go through
`dnpm install` + `dnpm check`). jsdom is heavier than the `node`
environment, so the suite will run slightly slower. The payoff is
real regression safety for a component library that five downstream
items depend on.

## How to work on this

1. The `idbStorage` / `updateCheck` tests already emit
   `indexedDB is not defined` warnings under `node` — jsdom may
   change that behavior. Check those specifically.
2. Keep render tests minimal and behavior-focused — assert what a
   user sees (content visible after trigger click), not internal
   Radix structure.
3. `dnpm isolated npx vitest run` fails because vite writes a temp
   config bundle to a read-only `node_modules`; use `dnpm run test`.
