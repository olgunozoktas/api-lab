---
title: Compare two responses side by side
date: 2026-05-17
---

API Lab can now diff two responses side by side. The top bar gains a
**Compare responses** button (the split-arrows icon) that opens a diff
view: pick a left and a right source from the dropdowns, and the two
bodies are lined up with added lines highlighted in green and removed
lines in red.

Sources are any open tab that has a response, plus history entries —
to make history diffable, API Lab now retains response bodies in
history (within a size budget, so a long session never bloats your
saved workspace). Binary responses and very large bodies aren't kept
for diffing; everything else is.

JSON responses are compared key-aware: keys are normalised before the
diff, so reordered keys don't show up as changes — only real value
differences do. Plain-text responses are compared line by line. Very
long responses are capped with a clear notice so the diff stays fast.
