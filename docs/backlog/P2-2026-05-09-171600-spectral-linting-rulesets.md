# Phase K.2 — Spectral linting + custom rulesets

Priority: P2

## Context

Spectral (`@stoplight/spectral-rulesets`) is the de-facto OpenAPI linter. Built-in rulesets enforce best practices ("operations must have `summary`", "no `additionalProperties: true`", etc). Rules are user-extensible via YAML.

## Items

- [ ] Lazy-load `@stoplight/spectral-core` + `@stoplight/spectral-rulesets/dist/rulesets/oas`
- [ ] Run on save in the K.1 editor; surface findings as gutter markers + a side panel listing all warnings + errors
- [ ] Custom ruleset support: `.spectral.yaml` next to the spec → loaded automatically
- [ ] In-app rule editor (small): paste/edit YAML, validate, persist alongside the spec

## Acceptance

Open a spec missing operation summaries → Spectral surfaces the warning inline + in the panel. Edit `.spectral.yaml` to disable a rule → next save, the warning disappears.

## Tradeoffs

Spectral is huge (~500 KB) — code-split mandatory. Default rules cover OWASP API Security Top 10 + Stoplight defaults; users can opt out per project.

## How to work on this

1. Phase K.1 MUST ship first.
2. Spectral SDK reference: https://docs.stoplight.io/docs/spectral
