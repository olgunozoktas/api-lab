---
title: A hung MCP server can no longer wedge the bridge
date: 2026-05-20
---

If you point an MCP request at a stdio server that hangs (ignores
stdin EOF, deadlocks, or just doesn't respond), API Lab now kills it
after **30 seconds** and reports a clear *timeout* error in the
response panel — instead of leaving the call stuck indefinitely. The
bridge thread comes back ready for the next request right away.

Internal-only watchdog hardening; no behavior change for well-behaved
servers, which exit on stdin EOF well inside the deadline.
