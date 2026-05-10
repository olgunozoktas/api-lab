---
title: Localized guides + changelog — switches with the active language
date: 2026-05-10
---

The in-app **Guides** and **Changelog** modals now follow the active
language picked in **Settings → Language**. Switch from English to
Turkish (or back) and both modals re-render with the matching
translation on the next open.

## How it works

Every entry now lives as `<slug>.<lang>.md` under
`frontend/src/guides/` or `frontend/changelog/{released,unreleased}/`.
Vite's build-time glob picks up all variants; a tiny selector
function picks the active-locale version per slug at render time.

If a translation is missing for the active locale, the modal falls
back to English so users always see *something* — partial coverage
is fine.

## What's translated

All 14 guides + all 6 changelog entries (v0.1.0 + 5 unreleased) ship
in both English and Turkish from this slice. Adding a new locale is
a single dictionary file in `lib/i18n/` plus duplicating the
markdown files under the new lang suffix.

## Bundle impact

The Turkish translations added ~40 KB raw / ~14 KB gzipped to the
JS bundle (still under the 1300/400 KB CI guardrail). Future
languages compound — a follow-up will lazy-load language packs once
we add a third locale.
