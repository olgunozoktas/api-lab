---
title: v0.2.0 — version-bump rule + bump-version.sh helper
date: 2026-05-12
---

API Lab now ships with an explicit version-bump policy. The `version`
field in `frontend/package.json` is the single source of truth (feeds
`__APP_VERSION__`, the TopBar badge, Settings → About, and the
changelog auto-open gate). Going forward every commit / PR that drops
a markdown entry under `frontend/changelog/unreleased/` MUST bump the
version in the same commit. Documented as a hard rule in CLAUDE.md.

Bump policy (semver-ish):

- **Patch** — small UX polish, copy tweaks, single panel hints.
- **Minor** — new feature surface, multiple patches combined.
- **Major** — reserved for breaking changes.

New helper:

```bash
bash scripts/bump-version.sh           # patch (default)
bash scripts/bump-version.sh minor
bash scripts/bump-version.sh major
```

Pure shell + `awk`; doesn't shell out to `npm` (which would violate
the dnpm-only policy). Increments the version + prints the result;
leaves the change unstaged so you can review + commit alongside the
rest of the slice.

This release lands as **v0.2.0** to reflect the dozens of polish
slices since v0.1.0 — per-panel hints (Auth / Body / Params /
Headers / Env), tab strip improvements (auto-name from URL, status
badge, scroll, pin, ⌘+Shift+T), history filter pills + context menu,
response timing tooltip, status-class tooltip, sidebar empty-state
guidance, Settings → About card + Your-data stats grid +
Reset-to-defaults, ⌘ K / ⌘ B / ⌘ L / ⌘ . / ⌥⌘→← shortcuts,
attribution headers, and a refreshed README.
