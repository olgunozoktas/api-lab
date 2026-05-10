---
title: Save as variable — chain requests via the response viewer
group: Automation
order: 0
---

After a request lands, you can extract any value from the response
into an environment variable for use in later requests — no scripts
needed.

## How

1. Send a request (e.g. a login that returns `{ "access_token": "..." }`).
2. In the response **Body** pane, right-click the value you want.
3. Pick **Değişken olarak kaydet... / Save as variable...**.
4. Name the variable (`access_token`), pick the environment, save.

A toast confirms `"<name>" → <env> environment'ına kaydedildi`. The
variable lands in the active environment immediately.

## Using it

Anywhere `{{var}}` substitution runs (URL, headers, params, body):

```
Authorization: Bearer {{access_token}}
```

The substitution happens at send-time against the **active**
environment, so switching environments swaps the value.

## Why this beats scripts

- No QuickJS sandbox involvement
- No script panel boilerplate
- Works from any response (HTTP, GraphQL, even gRPC unary)
- Visible — the var lives in the env editor, you can see it +
  edit it + delete it like any other

## Pre-requisite

You need at least one environment to save into. If you don't have
one yet, click **Env...** in the top bar and create one. Without
that, the "Save as variable" dialog reminds you to set one up
first.
