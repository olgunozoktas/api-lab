# Phase L.2 — Spec → mock + custom routing rules

Priority: P2

## Context

Extends Phase L.1 (mock from collection examples) to also mock from OpenAPI examples. Plus: custom routing rules for "if request matches X, return mock Y" — handles real-world flows where the same path returns different shapes per query/header.

## Items

- [ ] Mock server reads `examples` and `default` fields from an open OpenAPI spec
- [ ] If multiple examples per operation, default to first; user can pin via mock control panel
- [ ] New rule shape: `{matchOn: {path, method, query?, header?, bodyJsonPath?}, response: <ExampleId>}` — first match wins
- [ ] Rule editor in the mock control panel
- [ ] Tests: rule matching against canned scenarios

## Acceptance

User opens Stripe's spec → starts a mock from it → `curl http://127.0.0.1:NNNN/v1/charges` returns the spec's example payload. Adding a rule "header X-Test=fail → returns 500 example" works.

## Tradeoffs

Rule matching language is limited (string equality + JSONPath); regex rules deferred until users ask.

## How to work on this

1. Phase L.1 (mock server) + K.1 (spec editor) first.
2. JSONPath via `jsonpath-plus` (~30 KB).
