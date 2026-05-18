# Frontend upgrade 5/9 — Loading & skeleton states

GitHub Issue: [#31](https://github.com/olgunozoktas/api-lab/issues/31)

Priority: P2

## Context

Part of the 9-item frontend-view-upgrade initiative (2026-05-18
handoff). The audit found API Lab has **no loading states** — content
appears blank, then pops in. There are no skeletons or progress
indicators for response fetch, collection import, OpenAPI parse, gRPC
streams, SSE/WS connect, or git-sync. Blank-then-pop reads as cheap;
skeletons make the app feel responsive even when the network isn't.

## Items

- [ ] Skeleton / progress state for response fetch
      (`ResponseViewer.tsx` / `ResponseBody.tsx`).
- [ ] Loading state for collection import and OpenAPI spec parsing.
- [ ] Stream / connect indicators for the gRPC, SSE and WS panels
      (`GrpcResponseSection.tsx`, `SsePanel.tsx`, `WsPanel.tsx`).
- [ ] Sync-in-progress indicator in `SyncBanner.tsx`.
- [ ] Use the Item-2 `skeleton` / `spinner` primitives — no bespoke
      spinners; add a delay-show threshold so sub-100ms responses
      don't flicker a skeleton.

## Acceptance

A slow response shows a skeleton (after the delay threshold) then the
real body; import / parse / stream / sync each show a clear in-flight
indicator; fast responses show no flicker.

## Tradeoffs

Moderate blast radius — response viewer + 3 protocol panels + sync.
The 400-LOC cap is a real risk: `ResponseBody.tsx` (~333) and the
protocol panels (~311-320) are already close — extract sub-components
proactively rather than inlining loading branches.

## How to work on this

1. Depends on Item 2 (`ui-primitive-library`) — consumes `skeleton` +
   `spinner`.
2. Hook into the existing request-lifecycle / in-flight state in
   `store/response.ts` / `store/current.ts` (a cancellable request
   state already exists).
3. Wave-2.
