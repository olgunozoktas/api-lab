# Frontend upgrade 6/9 — Rich empty states + first-run onboarding

GitHub Issue: [#32](https://github.com/olgunozoktas/api-lab/issues/32)

Priority: P2

## Context

Part of the 9-item frontend-view-upgrade initiative (2026-05-18
handoff). API Lab's empty states are **text-only** — no icon, no
visual hierarchy, no call-to-action — and there is no first-run
onboarding. The empty screen is the literal first impression; right
now it doesn't guide a new user toward a first request.

## Items

- [ ] Create `ui/empty-state.tsx` — a reusable template: icon slot,
      title, description, primary CTA.
- [ ] Upgrade `ResponseEmpty.tsx` to use it (keep its recent-history
      list — that part is good).
- [ ] Add rich empty states to Collections (`CollectionList.tsx`),
      History (`HistoryList.tsx`), the gRPC services sidebar, and the
      Examples panel — each with a `lucide-react` icon + an actionable
      CTA (e.g. "Import a collection", "Send your first request").
- [ ] Add a lightweight first-run hint card (a single dismissable
      card, NOT a full tour), gated on a persisted flag.
- [ ] Route all copy through `useT` (en / tr).

## Acceptance

Every major empty surface shows an icon + description + CTA; the CTA
performs a real action; the first-run card appears once on a fresh
install and never again after dismissal.

## Tradeoffs

Keep onboarding to a single dismissable card — resist scope-creep
into a multi-step tour. The first-run flag must persist via the
existing `idbStorage` so it doesn't re-trigger across launches.

## How to work on this

1. Depends on Item 2 (`ui-primitive-library`) — for badge / visual
   conventions.
2. `ResponseEmpty.tsx` already has a partial empty-state pattern +
   an inline `Kbd` — generalize it into `ui/empty-state.tsx`. Icons
   from `lucide-react` (already a dependency).
3. Wave-2.
