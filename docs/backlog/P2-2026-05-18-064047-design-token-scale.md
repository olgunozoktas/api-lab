# Frontend upgrade 1/9 — Design-token scale: typography & spacing

GitHub Issue: [#27](https://github.com/olgunozoktas/api-lab/issues/27)

Priority: P2

## Context

Part of the 9-item frontend-view-upgrade initiative (see
`docs/sessions/` handoff dated 2026-05-18). A codebase + competitor
audit found API Lab's frontend is feature-complete but visually
utilitarian — the gap is design-system depth, not architecture.

The most pervasive symptom: there is **no named type or spacing
scale**. Raw arbitrary values — `text-[11px]`, `text-[10px]`,
`text-[9px]`, ad-hoc `py-1` / `py-1.5` / `px-2` — are scattered across
~57 components. Every component re-picks sizes, so the UI carries a
low-grade drift that reads as unpolished.

This item is the **foundation** of the initiative: it only *defines*
the scale (one file, zero component churn). The migration that
consumes it is a separate item (`token-scale-migration`) so the
57-file blast radius stays isolated and reviewable.

## Items

- [ ] Add a named typography scale to the `@theme` block in
      `frontend/src/main.css` — formalize the de-facto `9/10/11/12/13px`
      sizes into tokens (e.g. `--text-micro` … `--text-base`) each with
      a matching line-height.
- [ ] Add a named spacing-scale token set documenting the existing
      2/4/6/8/12/16/24 rhythm as the canonical scale.
- [ ] Add a short comment block in `main.css` documenting the scale
      and a one-line usage convention (single source of truth).
- [ ] Verify the additions render identically under all 6 themes
      (auto / light / dark / tokyo-night / github-light / high-contrast)
      — token additions are color-agnostic, so this is a visual check.
- [ ] Definition only — do NOT migrate any component here.

## Acceptance

`frontend/src/main.css` carries a documented type + spacing scale in
`@theme`; the app builds and renders byte-identically across all 6
themes; no component file changed.

## Tradeoffs

Defining the scale without migrating leaves a brief window where both
the scale and raw `text-[Npx]` values coexist — accepted, because
splitting definition from the 57-file migration keeps each change
small and revertible. Scale values must match the current de-facto
sizes so the later migration is a rename, not a re-layout.

## How to work on this

1. Read the existing `@theme` block in `frontend/src/main.css` — type
   tokens belong alongside the `--color-*` / `--font-*` tokens.
2. Survey current sizes with `grep -rho 'text-\[[0-9]*px\]'
   frontend/src/components | sort -u` before picking token values.
3. This is wave-1 foundation work — ship before `token-scale-migration`.
