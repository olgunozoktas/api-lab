---
title: Mock server — serve saved examples over HTTP
group: Composer
order: 5
---

The mock server turns your saved response **Examples** into a real
local HTTP server. Point any tool — curl, a browser, another
service on your machine — at it and get the saved response back.

## Starting a mock

1. Save one or more responses as **Examples** on a request (see the
   Examples guide).
2. Open the **Mock server** panel — the server icon in the top bar.
3. With that request active, hit **Start mock**. API Lab binds a
   loopback HTTP listener and hands you a `http://127.0.0.1:<port>`
   address.

## How requests are matched

The mock matches an incoming request to a saved example by
**method + path** — `GET /api/users` returns the example you saved
for that route, with its original status code, headers, and body.
The query string is ignored. If two examples share a
`(method, path)`, the first one wins.

A request that matches nothing gets a `404` with a short
diagnostic body.

## Managing mocks

The panel lists every running mock with its base URL and example
count. **Stop** ends one; **Stop all** ends them all. Mocks are
bound to `127.0.0.1` only — not reachable off your machine — and
shut down automatically when you close API Lab.

## Limits (v1)

- Matching is `(method, path)` only — no query / header / body
  matching yet.
- No per-mock request log.
- The mock lives inside the API Lab process; closing the app stops
  every running mock.
