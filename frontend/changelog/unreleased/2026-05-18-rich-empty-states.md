---
title: Friendlier empty states and a first-run welcome
date: 2026-05-18
---

Every empty surface in API Lab now greets you properly instead of
showing a wall of grey text. Collections, History, the gRPC services
sidebar, the Examples panel, and the empty response view each get an
**icon, a clear heading, and a description** — and a call-to-action
where there's a real next step to take.

On a fresh install, a **welcome card** appears once over the empty
response area pointing you at the address bar and the in-app guide.
Dismiss it and it's gone for good — it never nags you again.

The empty states are built on a new shared `EmptyState` template, so
they stay consistent everywhere.
