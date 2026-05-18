# i18n — hardcoded English fallback strings in three components

Priority: P3

## Context

Surfaced by the comment-quality audit (parallel agents over
`frontend/src/`, 2026-05-18). The audit's scope was comments, but the
component-sweep agent flagged a genuine off-scope defect: a few
components carry **hardcoded English strings** instead of routing
through `t()`, which violates the project's i18n hard rule ("every
user-facing string goes through `t()`").

Reported sites:

- `components/SamplesList.tsx:51` — `hideLabel = "Hide"` default.
- `components/TabStrip.tsx:97-105` — presenter default labels (English
  literals).
- `components/XmlTreeView.tsx:50` — `aria-label={open ? "Collapse" : "Expand"}`.

These are mostly presenter-prop *defaults* (a leaf component's
fallback when a container doesn't pass a label), so they rarely
render in practice — but the hard rule is absolute, and an English
`aria-label` is a real accessibility/i18n gap for Turkish users.

## Items

- [x] **Route the three sites through `t()`** — either the container
      always passes a translated label (preferred — keeps leaves
      string-free per the component hard rules), or the leaf takes a
      `TKey` instead of a literal default.
- [x] **Add any missing keys** to `lib/i18n/tr.ts` (source of truth)
      and `lib/i18n/en.ts`.
- [x] **Sweep for siblings** — grep `frontend/src/components/` for
      other literal English in `aria-label` / default label props the
      audit may not have caught.

## Acceptance

No component renders a hardcoded English user-facing string; every
label and `aria-label` resolves through `t()`. The TypeScript build
still passes (the `tr.ts`-is-source-of-truth check stays green).

## Tradeoffs

Small, low-risk. The component hard rules say leaves shouldn't carry
literal strings at all — prefer fixing at the container so the leaf
stays presentational, rather than just swapping a literal for a
`t()` call inside the leaf.

## How to work on this

Sites listed above. i18n keys live in `frontend/src/lib/i18n/tr.ts`
(source of truth — TS fails the build if other locales lack a key).
Run `cd frontend && dnpm run typecheck` + `dnpm run test`. Ship via
`/backlog-ship docs/backlog/P3-2026-05-18-183001-i18n-hardcoded-fallback-strings.md`.
