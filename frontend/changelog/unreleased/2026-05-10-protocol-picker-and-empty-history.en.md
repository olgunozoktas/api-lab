---
title: Protocol picker on new request + history suggestions in empty pane
date: 2026-05-10
---

Three small UX improvements for new-request flow.

## Protocol picker

Right-click any folder → "Yeni HTTP isteği" / "Yeni GraphQL" /
"Yeni WebSocket" / "Yeni SSE" / "Yeni gRPC". The selected kind
pre-fills the URL prefix (`wss://`, `sses://`, `grpcs://`) and
GraphQL toggles `isGraphql` so the right composer tab is active
the moment you land on the request — no more typing `wss://`
manually.

## Recent history in the empty response pane

When a fresh request hasn't been sent yet, the right pane now
lists the 6 most-recent history items as one-click cards (method
+ status + URL + elapsed-ms). Click one to load it into the
active tab — handy for "I want to re-run yesterday's call but
edit one header." The classic "Ready to send · ⌘+Enter / ⌘+S /
⌘+N" hint stays at the top.

## Quieter top bar for single-env users

The `default` environment dropdown in the top bar is hidden when
only one environment exists — it was visual noise without a
purpose. The "Env..." button stays so users can still discover +
create a second environment, at which point the dropdown comes
back automatically.
