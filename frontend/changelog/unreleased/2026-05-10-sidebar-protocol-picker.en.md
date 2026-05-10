---
title: Right-click "+ New Request" for protocol picker
date: 2026-05-10
---

The sidebar's bottom **+ New Request** button now picks up the same
protocol picker the folder context menu got: left-click is HTTP
default (matches the existing `⌘ N` shortcut), right-click reveals
five options — HTTP / GraphQL / WebSocket / SSE / gRPC.

Selecting a non-HTTP option resets the active tab and pre-fills the
URL prefix (`wss://` / `sses://` / `grpcs://`) and composer tab so
the right protocol-specific panel is visible immediately.

Discoverable via the button's tooltip ("Reset the active tab —
right-click to pick WS / SSE / gRPC"). The keyboard shortcut +
default-click behavior are unchanged.
