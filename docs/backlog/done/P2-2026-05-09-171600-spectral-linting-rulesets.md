# Phase K.2 — Spectral linting + custom rulesets

Priority: P2

## Context

Spectral (`@stoplight/spectral-rulesets`) is the de-facto OpenAPI linter. Built-in rulesets enforce best practices ("operations must have `summary`", "no `additionalProperties: true`", etc). Rules are user-extensible via YAML.

## Items

- [x] Lazy-load `@stoplight/spectral-core` + `@stoplight/spectral-rulesets/dist/rulesets/oas`
- [x] Run on save in the K.1 editor; surface findings as gutter markers + a side panel listing all warnings + errors
- [x] Custom ruleset support: `.spectral.yaml` next to the spec → loaded automatically
- [x] In-app rule editor (small): paste/edit YAML, validate, persist alongside the spec

## Acceptance

Open a spec missing operation summaries → Spectral surfaces the warning inline + in the panel. Edit `.spectral.yaml` to disable a rule → next save, the warning disappears.

## Tradeoffs

Spectral is huge (~500 KB) — code-split mandatory. Default rules cover OWASP API Security Top 10 + Stoplight defaults; users can opt out per project.

## How to work on this

1. Phase K.1 MUST ship first.
2. Spectral SDK reference: https://docs.stoplight.io/docs/spectral

## Progress

Shipped 2026-05-17 as v0.10.0 in `feat/spectral-linting-rulesets`.

`@stoplight/spectral-core` + `-parsers` + `-rulesets` + `@codemirror/lint`
added (153 packages; dnpm security check passed). Spectral runs in the
WKWebView — `dnpm run build` confirmed it bundles. The whole OpenAPI
editor is now `lazy()`-loaded by `App.tsx` so neither the editor nor
Spectral lands in the first-paint chunk.

**Item 3 reinterpretation.** "`.spectral.yaml` next to the spec →
loaded automatically" assumes a filesystem-adjacent file. api-lab
specs are in-memory tabs — there is no "next to". Item 4's in-app
rule editor IS the custom-ruleset mechanism: the ruleset YAML is
persisted on the spec tab (`SpecTabState.ruleset`) and applied
automatically on every lint pass. The filesystem variant is N/A for
api-lab's model; the user-facing capability — custom rulesets,
auto-applied — is fully delivered.

**Custom-ruleset scope.** The in-app ruleset layers a `rules` override
map on the built-in `oas` ruleset (disable a rule, or re-grade its
severity) — which is exactly what the acceptance needs ("disable a
rule → the warning disappears"). Authoring brand-new JSONPath
`given`/`then` rules would need the heavyweight Spectral ruleset
bundler/migrator and is out of scope.
