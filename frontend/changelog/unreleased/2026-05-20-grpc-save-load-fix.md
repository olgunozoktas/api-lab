---
title: Saved gRPC requests now restore their full state
date: 2026-05-20
---

Quiet bug fix: ⌘S on a gRPC request was silently dropping its
**fullMethod**, **message**, **metadata**, and **TLS overrides** on
save, so reopening the saved request brought back only the URL — every
gRPC composer field was empty. Both directions are now fixed: saving
captures the full gRPC state, and reopening restores it. No data
migration needed; this only affects future saves.

Same code path is also being primed for an upcoming MCP-server panel
upgrade — see the matching follow-ups when they land.
