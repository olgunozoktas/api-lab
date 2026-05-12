---
title: Copy body button flashes a check after copy
date: 2026-05-12
---

The **Copy body** button in the response header now briefly swaps
its paper-icon for a green check and the word "Copied" for ~1.2 s
after you click it. The existing toast still fires; the in-button
flash is the immediate feedback channel — the one your eye is
already focused on.

Backed by a new tiny `useCopyFeedback()` hook so the same flash
pattern can be reused on the headers-table copy buttons, history
context-menu copies, and the URL-bar copy actions in upcoming
slices.
