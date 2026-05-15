---
title: Import OpenAPI 3.x specs into Collections
date: 2026-05-15
---

The sidebar **Import** button now accepts **OpenAPI 3.0 / 3.1
specifications** — in either JSON or YAML — alongside Postman,
Insomnia, HAR, and Bruno.

Drop in a spec and every operation under `paths` becomes a request,
grouped into folders by its first `tag`. Each request is populated
from the spec:

- URL built from `servers[0].url` + the path, with `{var}` path
  parameters rewritten as `:var` and server variables filled from
  their defaults.
- Query and header parameters, with required ones enabled.
- Request body pre-filled from the operation's `example` (or the
  first named example / schema example).
- An auth stub from the first security scheme — bearer, basic, or
  API-key — for you to fill in with real credentials.

Local `$ref` pointers are resolved automatically; external file
refs are skipped with a warning in the developer console.

The OpenAPI importer and its YAML parser are loaded on demand, so
they add nothing to the app's startup bundle.
