# Phase K.1 — OpenAPI editor (CodeMirror, validation)

Priority: P2

## Context

Spec-first dev is the wedge from `docs/plans/piped-dazzling-pretzel.md` § CEO lens. To be a credible Stoplight Studio alternative for solo devs, we need an in-app spec editor with live schema validation — same artifact powers requests, mocks (L.2), and docs (K.3).

## Items

- [x] New side-pane mode: open a `.yaml` / `.json` spec file → split-pane CodeMirror (left) + tree of operations (right) — shipped as a new `spec` tab type (Slice 2)
- [x] CodeMirror with YAML + JSON modes; bracket-matching, fold gutter, search — added a `yaml` language mode to `CodeEditor`; the rest were already on (Slice 2)
- [x] Live validation — shipped as a zero-dep structural validator (`lib/specValidate.ts`) surfacing an error list in the editor's right pane, rather than full OAS JSON-Schema meta-schema validation + per-line gutter markers. Reason: ajv + bundled OAS dialect schemas would weigh down the bundle, and ajv-path→YAML-line source mapping is a separate problem. Full meta-schema validation can be a follow-up (Slice 3)
- [x] "Convert spec to collection" button: invokes the OpenAPI importer in-place (Slice 5)
- [x] Save spec to disk — shipped via the browser-download mechanism the response viewer already uses (`downloadTextFile`), not a native `dialog.saveFile` Zig bridge handler. Reason: no new native code, a path already proven inside the WKWebView host, consistent download UX. A native save panel can be a follow-up (Slice 4)
- [x] Tests: roundtrip a known-good spec + flag bad spec — 16 importer cases + 13 validator cases + 5 spec-tab store cases

## Acceptance

Open Stripe's spec → inline lint warnings appear within 1 second. Edit a path, save, reload — file persisted on disk.

## Tradeoffs

Validation library `ajv` is ~80 KB but battle-tested. Lazy-load (Phase O.0 prereq).

## How to work on this

1. Reuse existing CodeMirror setup from `frontend/src/components/ui/code-editor.tsx`.
2. ajv + ajv-formats; load OAS schema from CDN once + cache in memory.
3. Bridge `dialog.saveFile` matches the file picker pattern from E.1.
