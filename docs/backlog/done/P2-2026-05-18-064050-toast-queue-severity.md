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

- [x] Replace the single-toast model in `components/Toast.tsx` and the
      `toast` slice in `store/ui.ts` with a bounded queue (stack).
      → the `toast` state actually lived in `store/internal.ts` +
        `store/response.ts` (not `store/ui.ts`); replaced `toast: {…}|null`
        with `toasts: ToastEntry[]`, cap 4, oldest evicted on overflow.
        Pure queue ops in `lib/toast.ts` (`enqueueToast` / `removeToast`).
- [x] Add severity variants — success / error / warning / info —
      coloured from `--color-success` / `--color-danger` /
      `--color-warning` / `--color-accent`.
      → plus a full retrofit: ~40 of the ~45 `showToast` call sites now
        pass a real severity (errors→error, copies/saves→success,
        validation→warning); only `requestCancelled` stays `info`.
- [x] Add enter/exit micro-animation via `tw-animate-css` (the
      `data-[state]` pattern already used in `ui/dialog.tsx`).
      → `animate-in/out` slide+fade on `ToastItem`; exit is deferred
        ~180 ms so the out-animation plays before the node unmounts.
- [x] Optional per-toast action affordance (e.g. an "Undo" button).
      → `ToastEntry.action = { label, onAction }`; `ToastItem` renders
        the button when present. Wiring real Undo flows into destructive
        ops is a follow-up (no caller passes an action yet).
- [x] Keep `Toast.tsx` under the 400-LOC cap — extract a `ToastItem`
      sub-component if needed; preserve `role="status"` / `aria-live`.
      → `Toast.tsx` 23 LOC (container), `ToastItem.tsx` ~85 LOC
        (presenter); `role="status"` + `aria-live="polite"` preserved.

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
