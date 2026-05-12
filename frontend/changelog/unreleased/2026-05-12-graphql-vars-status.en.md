---
title: GraphQL Variables editor now flags invalid JSON
date: 2026-05-12
---

The Variables editor in the GraphQL composer tab gains the same
live status footer the request body editor got in v0.2.25 — byte
count colored by the size band, plus a JSON-validity chip:

- **Green check · Valid JSON** when the variables parse.
- **Orange triangle · Invalid JSON · &lt;message&gt;** when they don't,
  with the full parse error in the tooltip.

Closes a silent-failure path — historically a malformed Variables
JSON would silently default to `{}` on the wire, leaving you to
puzzle over why the query came back missing data. Now the failure
is visible before you hit Send.
