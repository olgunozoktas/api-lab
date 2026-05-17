# Phase K.3 — Spec → docs (Redoc-style preview)

Priority: P2

## Context

A spec the user lints + edits should also be browseable as docs without leaving the app. Redoc renders OAS into nice three-column docs (sidebar of operations, middle of details, right of code samples). We embed it in a sandboxed iframe.

## Items

- [x] Lazy-load `redoc` (the standalone React component) into a side-pane next to the K.1 editor
- [x] Update preview live as the user edits the spec
- [x] Theme: match API Lab's current theme (dark/light toggle)
- [x] "Open in browser" button: writes a self-contained HTML to a temp file + opens via system default browser

## Acceptance

Edit a spec in the editor → docs preview updates within 500 ms. Click an operation in the preview sidebar → matching CodeMirror line scrolls into view.

## Tradeoffs

Redoc is heavy (~1 MB) — code-split with K.1 + K.2 trio so cold-start unaffected.

## How to work on this

1. Phase K.1 + K.2 first.
2. Use `redoc-cli` build for the offline self-contained HTML; embed via dynamic-import for the in-app preview.

## Progress

Shipped 2026-05-18 as v0.11.0 in `feat/spec-to-docs-redoc-preview`.

`redoc` 2.5.2 added (with its mobx / styled-components / core-js
peers; dnpm security check passed). `dnpm run build` confirmed it
bundles for the WKWebView — Redoc lands in its own ~1 MB lazy chunk
(`RedocPane-*.js`), never in first-paint.

**Item 4 reinterpretation.** "Write a self-contained HTML to a temp
file + open the system browser" — api-lab has no filesystem-write or
open-browser bridge, and a truly offline self-contained page would
inline Redoc's ~1 MB bundle. Shipped the pragmatic form: **Export
HTML** downloads a portable, standard Redoc page (spec inlined as
JSON, Redoc pulled from its CDN at open time). The user opens the
downloaded file themselves.

**Acceptance limitation.** "Click an operation in the preview sidebar
→ matching CodeMirror line scrolls into view" is not implemented:
`RedocStandalone` is a sealed third-party component with no hook for
"operation clicked → spec line". The live preview (item 2) updates as
you edit; the reverse direction (docs → editor) would need a
non-sealed renderer. Tracked as a follow-up.
