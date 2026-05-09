# Phase K.3 — Spec → docs (Redoc-style preview)

Priority: P2

## Context

A spec the user lints + edits should also be browseable as docs without leaving the app. Redoc renders OAS into nice three-column docs (sidebar of operations, middle of details, right of code samples). We embed it in a sandboxed iframe.

## Items

- [ ] Lazy-load `redoc` (the standalone React component) into a side-pane next to the K.1 editor
- [ ] Update preview live as the user edits the spec
- [ ] Theme: match API Lab's current theme (dark/light toggle)
- [ ] "Open in browser" button: writes a self-contained HTML to a temp file + opens via system default browser

## Acceptance

Edit a spec in the editor → docs preview updates within 500 ms. Click an operation in the preview sidebar → matching CodeMirror line scrolls into view.

## Tradeoffs

Redoc is heavy (~1 MB) — code-split with K.1 + K.2 trio so cold-start unaffected.

## How to work on this

1. Phase K.1 + K.2 first.
2. Use `redoc-cli` build for the offline self-contained HTML; embed via dynamic-import for the in-app preview.
