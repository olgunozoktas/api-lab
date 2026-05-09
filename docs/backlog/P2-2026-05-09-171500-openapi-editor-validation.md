# Phase K.1 — OpenAPI editor (CodeMirror, validation)

Priority: P2

## Context

Spec-first dev is the wedge from `docs/plans/piped-dazzling-pretzel.md` § CEO lens. To be a credible Stoplight Studio alternative for solo devs, we need an in-app spec editor with live schema validation — same artifact powers requests, mocks (L.2), and docs (K.3).

## Items

- [ ] New side-pane mode: open a `.yaml` / `.json` spec file → split-pane CodeMirror (left) + tree of operations (right)
- [ ] CodeMirror with YAML + JSON modes; bracket-matching, fold gutter, search
- [ ] Live validation against OAS 3.0 + 3.1 JSON Schema; surface errors as gutter markers
- [ ] "Convert spec to collection" button: invokes the I.2 importer in-place
- [ ] Save spec to disk via new bridge command `dialog.saveFile({content, suggestedName})`
- [ ] Tests: roundtrip a known-good spec; flag bad spec correctly

## Acceptance

Open Stripe's spec → inline lint warnings appear within 1 second. Edit a path, save, reload — file persisted on disk.

## Tradeoffs

Validation library `ajv` is ~80 KB but battle-tested. Lazy-load (Phase O.0 prereq).

## How to work on this

1. Reuse existing CodeMirror setup from `frontend/src/components/ui/code-editor.tsx`.
2. ajv + ajv-formats; load OAS schema from CDN once + cache in memory.
3. Bridge `dialog.saveFile` matches the file picker pattern from E.1.
