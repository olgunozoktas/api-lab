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

- [x] Skeleton / progress state for response fetch
      (`ResponseViewer.tsx` / `ResponseBody.tsx`).
      → `ResponseViewer` shows `<ResponseBodySkeleton>` (six `Skeleton`
        lines) in the body slot while a request is in-flight, gated by
        the delay threshold. `busy` is threaded App → ResponseViewer.
- [x] Loading state for collection import and OpenAPI spec parsing.
      → shipped via the child file
        `done/P2-2026-05-18-114609-loading-states-import-protocol-panels.md`
        (2026-05-20, v0.15.1) — `ImportPostmanButton` was extracted
        from `Sidebar.tsx` (over the 400-LOC cap) and wired an
        `importing` spinner gated by `useDelayedFlag`. Spec parse
        already drove `SpecSidePanel.busy`, so the in-flight indicator
        was already in place.
- [x] Stream / connect indicators for the gRPC, SSE and WS panels
      (`GrpcResponseSection.tsx`, `SsePanel.tsx`, `WsPanel.tsx`).
      → shipped via the same child file — each StatusPill grew a
        delayed Spinner glyph when its state is `running` /
        `connecting` / `closing`.
- [x] Sync-in-progress indicator in `SyncBanner.tsx`.
      → `SyncBanner` renders a calm spinner strip when
        `syncStatus.state === "syncing"` (the state already existed but
        was never surfaced).
- [x] Use the Item-2 `skeleton` / `spinner` primitives — no bespoke
      spinners; add a delay-show threshold so sub-100ms responses
      don't flicker a skeleton.
      → `lib/useDelayedFlag.ts` — the reusable delay-show hook (default
        140 ms). Skeleton/spinner are the #28 primitives; no bespoke
        spinners added.

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

## Follow-ups

Items 1, 4, 5 (response-fetch skeleton, sync indicator, the shared
delay-show hook) shipped 2026-05-18. Items 2 and 3 are **deferred** —
this file stays live:

- **#2 Import / OpenAPI-parse loading** and **#3 gRPC/SSE/WS
  stream-connect indicators** were deferred to keep this slice focused
  at the tail of a long session. #3 in particular is the file-cap-risk
  surface the Tradeoffs section warns about — `ResponseBody.tsx` (~335)
  and the protocol panels (~311-320) need proactive sub-component
  extraction before a loading branch can be added without breaching
  the 400-LOC cap.

A follow-up backlog file — **loading states: import + protocol
panels** — was created this session for #2/#3. The shared
`lib/useDelayedFlag.ts` hook is in place for it to consume directly.
