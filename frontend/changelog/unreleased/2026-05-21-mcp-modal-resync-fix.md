---
title: Fix — MCP integrations now show up in the MCP servers modal
date: 2026-05-21
---

Enabling findutils (or any future `kind: "mcp"` integration) from
the Integrations gallery installed the server config into your
library correctly, but it didn't appear in the **TopBar → MCP
servers** modal until the next app launch. Cause: the modal
captured the store's `mcpServers` array once at app start and never
re-synced on subsequent opens — the integration was always in the
store, the modal just rendered a stale copy.

The modal now re-syncs the local buffer from the store every time
it opens. Pending edits inside the modal are still discarded on
close-without-save (same EnvEditorModal pattern), and integration-
provided rows already merged correctly into the store on save —
this fix is purely about what the modal renders.
