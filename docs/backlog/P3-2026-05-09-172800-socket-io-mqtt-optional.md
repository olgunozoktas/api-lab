# Phase J.4 — Socket.IO + MQTT (demand-driven optional)

Priority: P3

## Context

Both protocols have user bases but rarely overlap with REST/GraphQL/gRPC users. Demoted to demand-driven per `docs/plans/piped-dazzling-pretzel.md` § "Promoted vs. demoted". Ship only if real users ask after Phase H lands.

## Items

- [ ] Socket.IO panel: detect URL prefix `socketio://` (or auto-detect on `http://...?EIO=4` query) → swap to a Socket.IO workspace
- [ ] socket.io-client lib (lazy-loaded) in the panel; emit-ack-listen UI
- [ ] MQTT panel: detect `mqtt://` / `mqtts://` → MQTT workspace
- [ ] mqtt.js (lazy-loaded) in the panel; pub/sub UI per topic, retained-message indicator, QoS picker
- [ ] Connection state pill (same StatusPill component reused)

## Acceptance

User points at a public Socket.IO test server → connects, emits an event, sees ack + listened events. Same for MQTT against `test.mosquitto.org`.

## Tradeoffs

Both libs are mid-size (~50 KB each); lazy-load eats the cost only when used.

## How to work on this

1. Reuse `frontend/src/components/WsPanel.tsx` structure.
2. socket.io-client + mqtt.js both have browser builds.
