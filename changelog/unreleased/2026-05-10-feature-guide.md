---
title: In-app feature guides — press ? for help anytime
date: 2026-05-10
---

API Lab now ships an in-app guide hub. Press **`?`** anytime to open
it — or click the new help-circle icon in the top bar. Eight
walkthrough guides cover the highest-leverage features:

- **Quick start** — your first request, the three panes
- **Environments** — `{{var}}` substitution, switching contexts
- **gRPC** — reflection, TLS, manual proto fallback
- **Request cancellation** — `⌘ +.` and the Send-morphs-to-Cancel
  button
- **Quick switcher** — `⌘ P` and multi-tab patterns
- **Examples** — saving response fixtures
- **WebSocket and SSE** — streaming protocols
- **Postman import** — bringing collections over

Search across title / group / body filters the sidebar live. Guides
are markdown files under `frontend/src/guides/`; new entries become
visible after a rebuild without any other code changes.

Reuses the same hand-rolled markdown subset renderer that powers the
changelog modal — no new dependencies, escape-by-default safety.
