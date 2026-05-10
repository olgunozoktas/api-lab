---
title: Changelog modal — see what's new in-app
date: 2026-05-10
---

API Lab now ships a built-in changelog. On first launch after an
upgrade, a "What's new" modal opens automatically with everything
that's landed since you last looked. The clock-history button in
the top bar opens it again anytime.

- **Auto-open on upgrade** — compares the bundled `APP_VERSION`
  against an IDB-persisted `lastSeen` and opens once per upgrade.
- **Manual access** — clock-history icon between Env... and
  Settings opens the modal without touching `lastSeen`.
- **Markdown formatting** — entries support headings, lists, code
  blocks, links, bold/italic. Hand-rolled subset renderer with
  escape-by-default safety; no new dependencies.

Changelog entries live in `changelog/{released,unreleased}/*.md`
at the repo root. From this ship onward, every user-visible change
drops a markdown file in `changelog/unreleased/` (CLAUDE.md hard
rule). Internal-only refactors don't need an entry — author judges,
reviewer pushes back if the call is wrong.
