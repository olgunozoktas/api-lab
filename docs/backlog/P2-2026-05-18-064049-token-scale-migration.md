# Frontend upgrade 3/9 — Token-scale migration across components

GitHub Issue: [#29](https://github.com/olgunozoktas/api-lab/issues/29)

Priority: P2

## Context

Part of the 9-item frontend-view-upgrade initiative (2026-05-18
handoff). Item 1 (`design-token-scale`) defines a named type +
spacing scale in `@theme`. This item *applies* it: replacing the raw
arbitrary `text-[9/10/11px]` values and ad-hoc padding scattered
across ~57 components with the named tokens, so the scale goes from
theory to enforced practice.

It is deliberately a separate item from the scale definition because
it is the **largest blast radius** in the initiative — touching every
component file — and must be batched + verified per slice.

## Items

- [ ] Replace raw `text-[9/10/11px]` and ad-hoc padding with the
      Item-1 scale tokens across the ~57 affected files.
- [ ] Migrate in **batches by area** — ui primitives → response panels
      → sidebar/collections → modals → protocol panels — one reviewable
      slice per batch.
- [ ] Run `dnpm isolated` typecheck + vitest after every batch.
- [ ] Rename only — no intended visual change; flag any component
      whose old size genuinely sat off-scale as a documented exception.
- [ ] Confirm all 6 themes still render correctly after the full pass.

## Acceptance

`grep -r 'text-\[[0-9]' frontend/src/components` returns only
documented exceptions; the app renders visually unchanged; typecheck
+ vitest green; bundle size unchanged.

## Tradeoffs

Largest-blast-radius change of the initiative. Mitigation: batch by
area, typecheck + test per batch, keep each batch PR-sized, and never
combine the rename with behaviour changes. Some raw sizes are
intentionally off-scale (e.g. the code editor) — leave them with a
comment rather than force-fitting.

## How to work on this

1. Depends on Item 1 (`design-token-scale`) — do not start until the
   scale tokens exist in `main.css`.
2. `grep -rl 'text-\[' frontend/src/components` enumerates the
   batches; migrate in the area order above.
3. Wave-2; can run in parallel with the other wave-2 items (mostly
   different files).
