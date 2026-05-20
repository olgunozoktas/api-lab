---
title: findutils in the integrations gallery + sharper MCP affordances
date: 2026-05-20
---

Three coupled polishes on top of the MCP first-class ship:

- **findutils in the integrations gallery.** The TopBar *Integrations*
  button now lists **findutils** under category **MCP**. Enable it
  and it installs into your MCP servers library with an *Integration*
  badge; disable it and the entry is removed (any tabs that pointed
  at it keep their saved tool name + args and show *(deleted server)*
  in the picker). A new `mcp` integration fetch kind sits next to the
  existing `curated` and `openapi-url` kinds — any future MCP-style
  integration is now a one-line registry entry.
- **Per-row Refresh button** on every MCP server in the library. For
  user-added servers, Refresh = re-fetch tools (and cache them, so
  the next MCP tab opens instantly). For integration-provided
  servers, Refresh also re-applies the current registry definition
  — so a URL or name shipped in a new app version propagates the
  moment you ask for it. Toast reports "N tools" or the error.
- **Save button in the MCP request tab.** The on-screen button
  mirrors what ⌘S already did; saving an MCP request now derives a
  meaningful tab name from `<server> · <toolName>` instead of a junk
  URL-based label.

Integration-provided servers are read-only in the library (Edit /
Delete are hidden) so registry-managed state stays the source of
truth; removal happens by disabling the integration.
