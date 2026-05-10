# Changelog

User-visible changes to API Lab.

`released/<version>.md` is the per-release archive — created when a
new VERSION ships. `unreleased/<slug>.md` is the working set —
populated as slices land on `main`.

Convention (CLAUDE.md hard rule): every change that touches user-
facing behavior MUST drop a markdown file in
`frontend/changelog/unreleased/` in the same commit as the change.
At release-cut time, the entries are concatenated into
`frontend/changelog/released/v<version>.md` and the unreleased slot
is emptied.

The directory lives under `frontend/` (not at the repo root) so the
dnpm docker build can see it — the build container only mounts
`frontend/` as `/app`, and anything outside that path is invisible
to Vite's `import.meta.glob` at build time.

Internal-only refactors (no user-visible delta) do NOT require an
entry. The author judges; reviewer pushes back if the call is wrong.

## Entry format

```markdown
---
title: Short user-facing headline
date: 2026-05-10
---

One paragraph of prose explaining what changed and why the user
should care.

- Optional bullet list
- For specific subpoints

## Optional subheading

More detail. Code blocks fine. Links fine. Keep it under ~300
words per entry.
```

The bundled `frontend/src/lib/changelog.ts` glob-imports every `.md`
under `released/` + `unreleased/` at build time and sorts entries
newest-first by date.

## What gets shown when

The in-app modal opens automatically on first launch when
`APP_VERSION > lastSeenVersion` (persisted in IDB). After that, the
"Changelog" entry in the Settings menu opens the same modal anytime
without touching `lastSeenVersion`.
