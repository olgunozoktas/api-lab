# Start a mock straight from the Examples tab

Priority: P3

## Context

Follow-up to `docs/backlog/done/P1-2026-05-09-180400-mock-server-zig-sidecar.md`
(shipped 2026-05-16). The mock server ships with a `MockControlPanel`
modal reached from a TopBar server icon. That works, but the mental
model gap is real: a user saves responses in the **Examples tab** of
the response viewer, then has to discover an unrelated top-bar icon to
turn those examples into a running server.

The 10-star version puts the action where the data already is — a
"Start mock" affordance directly in the Examples tab, so the path is
"save example → start mock" without a context switch. The TopBar panel
stays as the management surface (list / stop / stop-all).

## Items

- [ ] Add a "Start mock" button to `ExamplesPanel` (or its container),
  enabled when the request has ≥1 example. Reuse `buildMockStartPayload`
  + `startMock` from `lib/mock.ts` — no new bridge logic.
- [ ] On success, toast the `127.0.0.1:<port>` address (reuse the
  existing `mock.toast.started` key) and optionally offer to open the
  `MockControlPanel` so the user sees the running mock.
- [ ] Keep the leaf component store-agnostic — the button takes an
  `onStartMock` callback prop; the container wires the bridge call.
- [ ] No new i18n keys needed beyond a possible `mock.start` reuse;
  add one only if the in-tab affordance needs distinct wording.

## Acceptance

With ≥1 saved example on a request, the user can start a mock without
leaving the Examples tab, and the resulting base URL is surfaced
immediately. The TopBar `MockControlPanel` still lists the mock.

## Tradeoffs

- Two entry points (Examples tab + TopBar panel) for "start a mock" —
  acceptable: the tab is the contextual shortcut, the panel is the
  management view. They share `lib/mock.ts`, so no logic duplication.
- Could clutter the Examples tab header — keep it a single compact
  button, not a full control cluster.

## How to work on this

1. `frontend/src/components/ExamplesPanel.tsx` is the surface; check
   whether it has a container/presenter split already and follow it.
2. `lib/mock.ts` already exposes everything needed — this is pure UI
   wiring, no native or bridge changes.

## Reference

- Parent: `docs/backlog/done/P1-2026-05-09-180400-mock-server-zig-sidecar.md`
- Mock helpers: `frontend/src/lib/mock.ts`
- Existing panel: `frontend/src/components/MockControlPanel.tsx`
