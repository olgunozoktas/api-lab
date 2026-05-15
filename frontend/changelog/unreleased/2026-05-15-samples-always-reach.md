---
title: Hidden samples stay reachable — ⌘ P, Settings panel, empty CTA
date: 2026-05-15
---

Closes the loop on the Samples feature with three "always reach"
surfaces so hidden samples never disappear from view:

- **⌘ P command palette** — typing any sample name (e.g. "ws echo",
  "graphql countries") surfaces it in the switcher, **regardless of
  hidden state**. Selecting from the palette loads the sample *and*
  un-hides it in the sidebar so you see what you just picked.
- **Settings → Sample requests** — a new panel lists every built-in
  sample with a per-row eye-toggle (Show / Hide), a section-level
  "Show samples section" checkbox, and a "Show all" button that
  reveals everything at once.
- **Sidebar empty-state CTA** — when your Collections are empty and
  every sample is hidden, the empty state surfaces a "← Restore
  sample requests" link that re-reveals them in one click.

The sample manifest is bundle constants, so no matter what state your
hidden set ends up in, every sample is one ⌘ P / one settings toggle
/ one empty-state click away.

Closes #26 (sample requests sidebar with hide/show discovery) —
shipped across v0.2.31 (manifest) → v0.2.32 (sidebar render) →
v0.2.33 (hide/show + persistence) → v0.2.34 (always-reach paths).
