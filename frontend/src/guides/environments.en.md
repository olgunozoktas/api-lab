---
title: Environments — switch base URLs and tokens
group: Basics
order: 2
---

Environments hold per-context variables (different base URLs, API
keys, OAuth tokens). The active environment's variables are
substituted into your request via `{{var_name}}` syntax.

## Setting up

1. Click **Env...** in the top bar.
2. Add an environment (e.g. `dev`, `staging`, `prod`).
3. Define key/value pairs:
   ```
   base_url=https://api.dev.example.com
   token=eyJhbGc...
   ```
4. Pick the active environment from the dropdown next to **Env...**.

## Using variables

Anywhere in URL, headers, query params, or body:

```
GET {{base_url}}/users
Authorization: Bearer {{token}}
```

The substitution happens at send-time. The active environment's
values win; missing keys leave the `{{...}}` literal in place so
you can spot them.

## Pro tips

- Importing a Postman collection adds its variables to a fresh
  environment automatically.
- Save a response value as a variable: select the value in the
  response pane, click **Değişken olarak kaydet... / Save as
  variable...**, name it, and it lands in the active env.
- Switch environments mid-session — the active dropdown is a
  one-click toggle.
