---
title: Send button warns when the URL has unresolved `{{vars}}`
date: 2026-05-12
---

When the URL contains at least one `{{var}}` that isn't defined in
the active environment, the Send button's paper-plane icon now
swaps for a small warning triangle in the warning colour. Hover the
button to read why — the same hint from the URL preview about a
typo or missing env key.

Pairs with v0.2.6's red-highlighted unresolved vars in the preview
line: the warning shows up *before* you click Send, not after the
request fires with a literal `{{userId}}` in the path.
