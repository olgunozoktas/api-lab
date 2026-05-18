# Loading states — collection import + gRPC/SSE/WS protocol panels

Priority: P2

## Context

Follow-up to `docs/backlog/P2-2026-05-18-064051-loading-skeleton-states.md`.
That item's framework — the shared `lib/useDelayedFlag.ts` delay-show
hook, the response-fetch skeleton, and the sync-in-progress banner —
shipped 2026-05-18 (items 1, 4, 5). Items 2 and 3 were deferred to keep
that slice focused; this file completes them.

The remaining surfaces with no loading state:

- **Collection import / OpenAPI parse** — importing a Postman/Bruno/HAR
  file or parsing an OpenAPI spec runs async with no in-flight
  indicator.
- **gRPC / SSE / WS panels** — `GrpcResponseSection.tsx`,
  `SsePanel.tsx`, `WsPanel.tsx` have no clear stream-connect /
  in-flight indicator.

## Items

- [ ] Loading indicator for collection import + OpenAPI spec parsing
      (the import handlers in `Sidebar.tsx` / `OpenApiEditor.tsx`).
- [ ] Stream / connect indicators for the gRPC, SSE and WS panels.
- [ ] Each surface consumes the shipped `lib/useDelayedFlag.ts` hook +
      the `Skeleton` / `Spinner` primitives — no bespoke spinners.

## Acceptance

Importing a collection / parsing a spec shows an in-flight indicator;
each protocol panel shows a clear connecting/streaming state; all use
the shared delay-show hook so fast operations don't flicker.

## Tradeoffs

**400-LOC-cap risk** — this is why items 2/3 were split out.
`ResponseBody.tsx` (~335) and the protocol panels (~311-320) are
already close to the cap; a loading branch can't just be inlined. Each
panel needs a proactive sub-component extraction *first* (e.g. a
`<PanelConnectingState>` presenter) so the loading state lands without
breaching the cap.

## How to work on this

1. The shared `lib/useDelayedFlag.ts` hook is already in place — reuse
   it directly.
2. For each protocol panel: `wc -l` first, extract a sub-component to
   create headroom, *then* add the connect/stream indicator.
3. Build `./build.sh`; tests `cd frontend && dnpm run test`; typecheck
   `dnpm isolated npx tsc --noEmit`.
