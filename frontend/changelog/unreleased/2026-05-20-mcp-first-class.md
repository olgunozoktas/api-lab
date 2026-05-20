---
title: MCP is now a first-class request kind
date: 2026-05-20
---

The MCP server panel got the upgrade it deserves. What used to be a
one-shot modal — re-type the command + args every time, no way to
save anything — is now wired into the rest of the app like HTTP,
WebSocket, SSE, and gRPC.

- **Saved MCP servers** — the TopBar's *MCP servers* button now opens
  a library where you add, name, edit, and describe servers (stdio or
  HTTP). Edit a server once, every request that uses it picks up the
  change.
- **MCP requests live in tabs** — *+ New request → MCP* opens a tab
  with a server picker in place of the URL bar, a tools list, and a
  call form. ⌘S saves it into your sidebar like any other request;
  reopening restores the server reference, the tool, and your args.
- **Tools are cached per server** for the session, so reopening a
  saved MCP request shows its tools instantly. Editing a server's
  transport invalidates the cache so the next list call hits the wire.
- **Open in tab** — every row in the library has a one-click
  shortcut that opens a fresh MCP tab pointed at that server.
- **Delete is safe** — removing a server keeps your saved tool names
  and args; the affected requests show *(deleted server — pick
  another)* in the picker so you can re-point without losing work.
