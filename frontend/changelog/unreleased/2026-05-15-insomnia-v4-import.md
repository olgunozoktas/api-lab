---
title: Insomnia v4 collections can now be imported alongside Postman v2
date: 2026-05-15
---

The sidebar **Import** button now accepts Insomnia v4 exports in
addition to Postman v2.1 collections — format is auto-detected from
the JSON shape so the same button handles both.

What gets imported:

- **Workspace + nested request_group folders + requests** (the full
  tree is rebuilt from Insomnia's flat `resources[]` array via the
  `parentId` references).
- **Method, URL, headers, query parameters** — disabled flags
  preserved.
- **Body** — `application/json` mapped to the JSON body editor;
  other `mimeType` values land as raw text with a warning.
- **Authentication** — `bearer`, `basic`, `apikey` (header only),
  `oauth2` (token-only stub). Other auth types fall back to none
  with a warning.
- **Environments** — `environment.data` is flattened into envVars.
  Nested-object keys are skipped with a warning.

What's deferred (Bruno + HAR remain queued in the parent P2):

- Bruno BRU plain-text format
- HAR 1.2 import → History entries

Closes the first item of `P2-2026-05-09-171400-insomnia-bruno-har-import.md`.
12 new vitest cases bring the suite to **420 tests** (was 408).
