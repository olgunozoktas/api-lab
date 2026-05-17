---
title: Spectral linting for OpenAPI specs
date: 2026-05-17
---

The OpenAPI editor now lints your spec with **Spectral** — the
industry-standard OpenAPI linter. Open a spec and, alongside the
existing structural validation, a new **Spectral lint** panel lists
every best-practice warning and error: missing operation
descriptions, absent `servers`, sparse `info`, and the rest of the
built-in `oas` ruleset. Each finding also shows up as a marker in the
editor's gutter, right on the offending line.

**Custom rulesets.** Click **Edit ruleset** to open an in-app YAML
editor. Layer a `rules` override map on the built-in ruleset — turn a
noisy rule off, or re-grade its severity (`error` / `warn` / `info` /
`hint`). The ruleset is saved with the spec tab and applied
automatically on every lint pass, so you can tune the defaults
per-project without leaving the app.

Spectral is large (~500 KB), so the whole spec editor — Spectral
included — loads on demand: it never weighs down API Lab's startup.
