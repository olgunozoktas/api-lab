# Proxy bypass list (curl --noproxy)

Priority: P3

## Context

Follow-up to `docs/backlog/P2-2026-05-09-171000-cookies-proxy-sigv4-mtls.md`
(proxy shipped 2026-05-17). The proxy slice added a single Proxy URL
field (curl `--proxy`, covering HTTP / HTTPS / SOCKS5 via the URL
scheme). The original item also called for a **bypass list** — hosts
that should skip the proxy — which was not shipped.

## Items

- [ ] Add a "Proxy bypass" field to Settings (comma-separated host
  patterns, e.g. `localhost,127.0.0.1,*.internal`).
- [ ] Thread it through the `http.request` bridge payload and emit
  curl `--noproxy <list>` in `buildArgv` when set.
- [ ] Test the `--noproxy` arg construction.

## Acceptance

With a proxy configured, requests to a bypass-listed host go direct
rather than through the proxy.

## Tradeoffs

- curl's `--noproxy` takes a comma-separated host list; surface it as
  a plain text field rather than a structured editor for v1.

## How to work on this

1. `frontend/src/components/SettingsModal.tsx` — next to the existing
   Proxy URL field.
2. `RequestDefaults` in `frontend/src/lib/types.ts` — add `proxyBypass`.
3. `src/handlers/http.zig` `buildArgv` — mirror the `--proxy` addition.

## Reference

- Parent: `docs/backlog/P2-2026-05-09-171000-cookies-proxy-sigv4-mtls.md`
