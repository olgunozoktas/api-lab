# Frontend upgrade 4/9 — Toast system: queue + severity variants

GitHub Issue: [#30](https://github.com/olgunozoktas/api-lab/issues/30)

Priority: P2

## Context

Part of the 9-item frontend-view-upgrade initiative (2026-05-18
handoff). `frontend/src/components/Toast.tsx` is a **single**
bottom-centre toast — one message at a time, no queue, no severity
styling. Fire two toasts in quick succession and the first is lost;
an error and a success look identical. Modern API clients show a
queued stack with success / error / warning / info weight.

## Items

- [ ] Replace the single-toast model in `components/Toast.tsx` and the
      `toast` slice in `store/ui.ts` with a bounded queue (stack).
- [ ] Add severity variants — success / error / warning / info —
      coloured from `--color-success` / `--color-danger` /
      `--color-warning` / `--color-accent`.
- [ ] Add enter/exit micro-animation via `tw-animate-css` (the
      `data-[state]` pattern already used in `ui/dialog.tsx`).
- [ ] Optional per-toast action affordance (e.g. an "Undo" button).
- [ ] Keep `Toast.tsx` under the 400-LOC cap — extract a `ToastItem`
      sub-component if needed; preserve `role="status"` / `aria-live`.

## Acceptance

Multiple toasts stack without dropping; each renders its severity
colour + an enter/exit animation; existing `showToast` call sites
work unchanged (severity defaults to info); `aria-live` preserved.

## Tradeoffs

`showToast` is called from many sites — the new severity argument
MUST be optional (default `info`) so existing callers need no change.
A bounded queue (cap ~3-4 visible) avoids a toast avalanche.

## How to work on this

1. Depends on Item 2 (`ui-primitive-library`) — reuse its spinner /
   styling conventions; align severity colours with `badge.tsx`.
2. Extend `components/Toast.tsx` + the `showToast` action in
   `store/ui.ts`; animation pattern from `ui/dialog.tsx`.
3. Wave-2.
