# WS sessions: record into history sidebar

Priority: P3

## Context

Surfaced during P2 #2 WebSocket slice (2026-05-09). The History
sidebar (`HistoryList.tsx`) currently shows HTTP requests only.
WebSocket sessions don't get recorded — closing a tab loses every
trace of "I connected to wss://X yesterday."

The HistoryItem type in `types.ts` is shaped for HTTP (status code,
size, elapsed). Recording WS would either require widening the type
or maintaining a sibling history.

## Items

- [ ] Decide between widening `HistoryItem` (one history list, mixed)
      vs. a parallel `wsHistory: WsHistoryItem[]` in the store
- [ ] Capture: connect-ts, disconnect-ts, message count, error code
- [ ] Reopen behavior: clicking a WS history entry sets the URL to
      its `wss://` and switches to WS mode (Connect button waits
      for user click — don't auto-connect on history click)

## Acceptance

After connecting to `wss://echo.websocket.org`, sending 3 messages,
disconnecting, the History sidebar shows the session with a duration
+ message count. Clicking it restores the URL.

## Tradeoffs

Mixed history (HTTP + WS in one list): simpler UI but breaks
HistoryItem's status-code-centric design.
Parallel history: cleaner data shape, but two scrolling lists in a
narrow sidebar feels cluttered.

## How to work on this

Probably mixed-list with a discriminated union — HistoryItem becomes
`{ kind: "http", ... } | { kind: "ws", ... }`. HistoryList renders
each kind via a small variant component.