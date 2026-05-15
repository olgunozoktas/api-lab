---
title: Live validation in the OpenAPI spec editor
date: 2026-05-15
---

The OpenAPI spec editor now validates your spec as you type. A
**Validation** panel sits above the operations outline and lists
every structural problem it finds, each tagged Error or Warn with
the JSON path it came from.

It catches the mistakes that actually bite:

- a missing or non-3.x `openapi` version, `info`, `info.title`,
  or `paths`
- path keys that don't start with `/`
- operations that declare no responses
- duplicate `operationId`s
- broken local `$ref`s that point nowhere
- server entries with no `url`

When the document doesn't parse as YAML or JSON at all, that's
surfaced as the single top error.

This is a fast, dependency-free structural check rather than full
JSON-Schema meta-schema validation — it covers the common cases
without weighing down the bundle.
