---
title: Wider modals + changelog actually populates + 6 new guides
date: 2026-05-10
---

Three things landed together — pure UX polish on the in-app help
surfaces.

## Wider modals

- **Guides** (`?` shortcut, top-bar help button) — `max-w-4xl` →
  `max-w-6xl` (≈1152px max), clamps to 92% of window width, sidebar
  nav widened 220 → 260 px so long guide titles don't wrap.
- **Changelog** (top-bar clock button) — `max-w-2xl` → `max-w-4xl`
  with the same 92vw clamp. Each entry card has more horizontal
  room for code blocks + bullet lists.

Both bumped vertical max to 88vh.

## Changelog now actually shows entries

The `changelog/` directory used to live at the repo root. Moved
into `frontend/changelog/` because the dnpm docker build container
only mounts `frontend/` — `import.meta.glob('../../../changelog/...')`
was silently resolving to nothing during build, and the modal
rendered an empty card list.

Same constraint that already pushed `APP_VERSION` to read from
`frontend/package.json` instead of a top-level `VERSION` file.
CLAUDE.md hard rule updated to reference the new path.

## Six new guides

Filled out the guide hub — total now 14:

- **Collections — organize requests into folders** (Workspace)
- **Body modes — JSON, form-encoded, raw** (Composer)
- **Auth — Bearer, Basic, API Key, OAuth 2.0 helper** (Composer)
- **Pre / post-request scripts — pm.\* sandbox** (Automation)
- **Save as variable — chain requests via the response viewer** (Automation)
- **Copy as code — share a request as a one-liner** (Workspace)

The `released/v0.1.0.md` entry also got a major expansion — every
major slice from the very first commit through the changelog
modal is now documented under sections covering architecture,
composer, workspace, authoring, cancellation, look + feel,
reliability, build, and platform.
