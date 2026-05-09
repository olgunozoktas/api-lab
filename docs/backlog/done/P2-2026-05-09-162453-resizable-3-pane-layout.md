# Resizable 3-pane layout — drag handles between sidebar / composer / response

Priority: P2

## Context

Today's layout is fixed `gridTemplateColumns: "240px 1fr 1fr"`. On a
27-inch monitor you might want the response viewer wider (long JSON
trees benefit from horizontal real estate); on a 13-inch laptop you
might want the sidebar narrower. Postman/Insomnia/Bruno all support
drag-to-resize between panes. We don't.

Three resize handles needed:

- Sidebar / composer divider (vertical drag, adjusts sidebar width)
- Composer / response divider (vertical drag, adjusts composer/response
  ratio)
- (Optional v2) Composer's request-section / scripts-section split if
  that view is open — vertical OR horizontal split inside the
  composer column.

Persisted widths in store/IndexedDB so the layout survives reloads.

WS-mode and gRPC-mode collapse to single column today (only sidebar
+ panel); resizing should work in those modes too — just the sidebar
divider remains.

## Items

- [ ] New `frontend/src/components/ResizableDivider.tsx` — pure
      pointer-driven drag component. Props: `orientation`,
      `min`, `max`, `value`, `onChange`. Pointer-capture pattern
      (`setPointerCapture` so drag survives mouse-leaves).
- [ ] Store: `ui.layout = { sidebarPx: number, composerFraction: number }`
      with sensible defaults (240, 0.5). Persisted via existing
      Zustand IDB middleware.
- [ ] App.tsx: replace fixed `gridTemplateColumns` with computed
      values from `ui.layout`. Insert `<ResizableDivider>` between
      panes.
- [ ] Snap-to-default on double-click: double-click any divider →
      reset that dimension to default.
- [ ] Min/max clamps: sidebar 180–400 px; composer fraction 0.25–0.75.
- [ ] Cursor + visual feedback: `col-resize` cursor on hover; subtle
      accent-color highlight while dragging.
- [ ] Touch + pen support via Pointer Events (Pointer Events covers
      mouse + touch + pen in one API).
- [ ] Tests: drag math (px-to-fraction conversion); clamp behavior;
      double-click reset; persistence round-trip.
- [ ] WS-mode / gRPC-mode: only the sidebar divider renders (the
      panel is single-column already).

## Acceptance

User drags the divider between sidebar and composer → sidebar
narrows, composer widens. Reloads the app → previous width persists.
Drags too far left → snaps to 180 px. Double-clicks divider →
returns to 240 px default. WS-mode shows only the sidebar divider
(panel is already 1-column).

## Tradeoffs

- **Pixel widths vs CSS grid fractions** — sidebar is naturally
  fixed-pixel; composer/response are best as a fraction of the
  remaining space (so window resizes don't break the ratio).
  v1 ships pixel for sidebar + fraction for composer/response;
  document why in the component.
- **Pointer Events vs separate mouse/touch handlers** — Pointer
  Events is the modern standard, supported in WKWebView. Use it.
- **Drag during animation / transitions** — divider's hover and
  drag state CSS could conflict with general transitions on
  parent containers. Apply `pointer-events: none` to siblings
  during drag to avoid event leakage.
- **Min/max constants** — start permissive (180–400 sidebar);
  loosen later if users complain. Keep defaults centered around
  current layout for zero-surprise upgrade.

## How to work on this

1. Read `frontend/src/App.tsx` for the current grid layout.
2. Read `frontend/src/store/index.ts` for `ui.theme` to see the
   `setUi` mutator pattern; add `ui.layout` the same way.
3. Look at how `WsPanel.tsx` collapses to single column for the
   single-column branch — the divider needs to react to that.
4. Reference: shadcn-ui's `resizable.tsx` (built on
   `react-resizable-panels`). Could install that package if our
   own implementation feels too involved; weigh dependency vs
   ~150 LOC of custom code.
5. New component file `ResizableDivider.tsx` should stay under
   200 LOC. Split if it grows.
