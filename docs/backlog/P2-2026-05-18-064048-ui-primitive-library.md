# Frontend upgrade 2/9 — UI primitive library: Tooltip, Badge, Skeleton, Spinner, Popover

GitHub Issue: [#28](https://github.com/olgunozoktas/api-lab/issues/28)

Priority: P2

## Context

Part of the 9-item frontend-view-upgrade initiative (see the
2026-05-18 handoff doc). The codebase audit found `frontend/src/
components/ui/` has solid primitives (button, dialog, select, tabs,
code-editor, context-menu, search-input, kbd-hint) but is **missing**
the primitives a polished tool leans on:

- **Tooltip** — only native `title=` is used today (no rich content,
  no positioning).
- **Badge** — method / status / count pills are inline `<span>`s
  styled by `methodClass` / `statusPillClass` in `lib/utils.ts`.
- **Skeleton** — no loading-placeholder primitive exists.
- **Spinner** — one ad-hoc `animate-spin` in `GrpcServicesSidebar`;
  no reusable component.
- **Popover** — only Radix `Select`; no generic floating panel.

This is the **highest-leverage foundation item** — it unblocks five
downstream items (toast, loading states, empty states, response-viz,
discoverability). Build the primitives once, properly.

## Items

- [ ] `ui/tooltip.tsx` — Radix-based; `dnpm install @radix-ui/react-tooltip`.
- [ ] `ui/badge.tsx` — `cva` variants for method / status / count
      pills; absorb `methodClass` + `statusPillClass` from `lib/utils.ts`.
- [ ] `ui/skeleton.tsx` — token-driven shimmer placeholder.
- [ ] `ui/spinner.tsx` — generic indeterminate spinner.
- [ ] `ui/popover.tsx` — Radix-based; `dnpm install @radix-ui/react-popover`.
- [ ] Each file small (`cva` + `cn` + `forwardRef`, `--color-*` tokens
      only); run `dnpm check` after the two installs.

## Acceptance

Five new primitives live under `frontend/src/components/ui/`, each its
own file well under the 400-LOC cap; `dnpm check` passes after the new
packages install; the primitives render correctly in all 6 themes.

## Tradeoffs

Adds two npm packages — both go through `dnpm install` + `dnpm check`
per the dnpm-only policy (CLAUDE.md). `badge.tsx` consolidating
`methodClass`/`statusPillClass` means a follow-up touch on their
current call sites — tracked under `token-scale-migration` or done
opportunistically; keep the old utils until call sites move.

## How to work on this

1. Follow `frontend/src/components/ui/button.tsx` exactly — `cva` +
   `forwardRef` + `cn`, the established house pattern.
2. Radix is already the house style (`react-dialog/select/tabs/
   context-menu/slot` installed) — tooltip + popover match it.
3. Wave-1 foundation — ship before items that consume these (toast,
   loading, empty-states, response-viz, discoverability).
