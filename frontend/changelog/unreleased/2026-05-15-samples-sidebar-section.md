---
title: Sidebar now shows a Samples section with ready-to-Send examples
date: 2026-05-15
---

The sidebar's Collections tab now opens with a **Samples** section
sitting above your saved Collections. It surfaces six built-in
requests — one per protocol API Lab supports:

- **HTTP GET** against httpbin.org/get
- **HTTP POST (JSON)** against postman-echo.com/post
- **GraphQL — Countries** against trevorblades.com
- **WebSocket — Echo** against ws.postman-echo.com
- **SSE — Tick stream** against sse.dev
- **gRPC — Reflection** against grpcb.in

Click any sample to load it into the active tab — URL, method,
headers, body, GraphQL query all populated and ready to **Send**.
The composer auto-switches to the protocol-appropriate panel based
on the URL prefix (`wss://`, `sses://`, `grpcs://`, etc.).

Samples are visually muted (italic, faded) to telegraph "not your
data" — clicking a sample creates a transient request in your active
tab; it never writes to your saved Collections.

Hide / show controls land in v0.2.33 (slice 3 of #26); always-reach
paths (⌘P, Settings panel, empty-state CTA) land in v0.2.34.
