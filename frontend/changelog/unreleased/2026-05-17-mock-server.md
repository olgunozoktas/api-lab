---
title: Mock server — serve saved examples over real HTTP
date: 2026-05-17
---

API Lab can now stand up a local mock server from your saved response
examples. Save a few responses as examples on a request, open the new
**Mock server** panel from the top bar (the server icon), and hit
**Start mock** — API Lab binds a real loopback HTTP listener and hands
you back a `http://127.0.0.1:<port>` address.

Anything that can make an HTTP request — `curl`, a browser, another
service on your machine — can now hit that address and get your saved
example back, with its original status code, headers, and body. The
mock matches incoming requests by method + path, so `GET /api/users`
returns the example you saved for that route.

- Start a mock for the current request straight from the panel.
- See every running mock with its base URL and example count.
- Stop one mock, or stop them all.
- Mocks are bound to `127.0.0.1` only and shut down cleanly when you
  close API Lab.
