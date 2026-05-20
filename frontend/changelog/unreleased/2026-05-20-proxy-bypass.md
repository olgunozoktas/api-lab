---
title: Proxy bypass list (curl --noproxy)
date: 2026-05-20
---

Settings → Network now has a **Proxy bypass** field that lets you carve
exceptions out of the configured proxy. The comma-separated host list
is threaded into every outbound request as curl's `--noproxy` so the
named hosts skip the proxy and go direct.

Useful when:

- You're routing everything through Charles / mitmproxy but want
  `localhost` and `127.0.0.1` to stay direct.
- Corporate split-horizon DNS resolves `*.internal` only off-proxy.

The field is ignored when the Proxy URL is empty (curl rejects
`--noproxy` standalone), so the common no-proxy path stays exactly as
fast as before.
