# WsPanel: preserve connection across tab switches

Priority: P3

## Context

Surfaced during P2 #2 WebSocket slice (2026-05-09). The v1 WsPanel
mounts with `key={activeTabId}` from App.tsx, which means each tab
has its own component instance. Switching tabs via ⌘+number, ⌘+P, or
the TabStrip unmounts the previous tab's WsPanel — its connection
gets closed in the cleanup effect, and its message log is lost.

For a multi-request workspace (the api-lab USP), this is a real
regression vs. the HTTP path where switching tabs preserves the
last response.

## Items

- [ ] Lift WebSocket lifecycle out of `WsPanelContainer`'s local state
- [ ] Add a module-scoped `Map<tabId, { ws: WebSocket, status: WsStatus, messages: WsMessage[] }>` keyed by tab id
- [ ] On tab switch: read the entry for the new active tab; component renders against its slice instead of remounting
- [ ] On tab close: close the socket and remove the entry
- [ ] On app close: best-effort close all sockets in the map

## Acceptance

Open tab A, connect to `wss://echo.websocket.org`, send a message,
switch to tab B (HTTP), switch back to tab A: connection still OPEN,
message log still shows the round-trip. Closing tab A closes its
socket.

## Tradeoffs

Map-of-WebSockets vs. Zustand store: Zustand serializes to
localStorage; storing live `WebSocket` objects there breaks. So the
Map has to be a module-level singleton outside the store. Status +
messages CAN go in the store (per-tab) — but the WebSocket itself
stays in the singleton.

Memory: each open socket holds buffered frames + close events. Capping
the per-tab message log at ~1000 entries (FIFO eviction) prevents
runaway memory.

## How to work on this

1. Extract a `wsConnections` module-level `Map` in `lib/wsRegistry.ts`.
2. Move `wsRef` from WsPanelContainer state into the registry.
3. Add `OpenTab.ws?: WsTabState` to types.ts so status + messages
   live with the tab.
4. WsPanelContainer reads from `useStore((s) => s.tabs.find(t =>
   t.id === activeTabId)?.ws)` and dispatches via store actions.
5. Tab close action triggers registry cleanup.