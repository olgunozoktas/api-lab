---
title: Author attribution headers + v{version} badge in the top bar
date: 2026-05-12
---

API Lab now wears its author plate everywhere:

- **Top bar** — a small `v0.1.0` badge sits next to the API Lab title,
  matching the version in Settings → About.
- **Source files** — every `.ts` / `.tsx` / `.css` under `frontend/src/`
  and every `.zig` under `src/` opens with a one-line
  `/** Olgun Özoktaş geliştirdi · API Lab */` attribution header. New
  files should follow the same convention (CLAUDE.md documents it).
- **Entry points** (`main.tsx`, `App.tsx`, `main.zig`, `build.zig`)
  carry a fuller banner with author, repo and license.
- **package.json** gains the standard `author` + `homepage` +
  `repository` fields.
- **README.md** + **CLAUDE.md** have a dedicated **Author** section.
- **README.md** Features + Keyboard reference sections refreshed to
  cover every shortcut and polish shipped recently (⌘+B, ⌘+K, ⌘+L,
  ⌘+., ⌘+Shift+T, ⌥⌘→/← , per-mode hints, env var-count badges,
  timing tooltip, status class description, sidebar empty-state
  guidance, About data stats, Reset to defaults, and more).
