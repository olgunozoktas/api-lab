---
title: Copy as code — share a request as a one-liner
group: Workspace
order: 3
---

The **Kod Kopyala / Copy as code** dropdown above the response pane
exports the active request as paste-ready code in six languages /
formats:

| Format              | Use case                     |
| ------------------- | ---------------------------- |
| `cURL`              | Share in chat / docs / Slack |
| `JS fetch`          | Browser console one-liner    |
| `JS XMLHttpRequest` | Legacy browser code          |
| `Node axios`        | Backend script template      |
| `Python requests`   | Quick repro in a notebook    |
| `Go net/http`       | Backend service starter      |

The exported code is **fully resolved**:

- `{{vars}}` are expanded against the active environment.
- Auth is applied inline (Bearer header materialized, Basic Auth
  base64-encoded, etc.).
- Body is rendered in the format mode you set (JSON pretty-printed,
  form-encoded as `key=value&...`, raw passed through verbatim).
- Headers carry over verbatim.

Pop-up confirms with a `{lang} kopyalandı / {lang} copied` toast.

## When the cURL is wrong

Some servers behave differently when curl bypasses certain default
headers (`Accept-Encoding: gzip`, `User-Agent: api-lab/0.1`). If
your reproduction needs identical bytes, check the **Headers**
sub-tab and explicitly add anything API Lab is auto-sending that
your downstream consumer doesn't.

## Reverse direction — paste curl into the URL bar

Drop a `curl ...` command into the URL field and a banner offers
to parse it: method, URL, headers (`-H`), body (`-d` / `--data`),
basic auth (`-u`), insecure (`--insecure`), and follow-redirects
(`-L`) all populate. Useful when someone pastes a "here's the
shape, just substitute your token" curl in chat.
