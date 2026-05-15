---
title: Samples can now be hidden — right-click to dismiss
date: 2026-05-15
---

The built-in Samples section in the sidebar is now dismissible.
**Right-click any sample → Hide this sample** removes it from the list.
Hidden samples survive an app restart (state persists via the same
IndexedDB layer your Collections + History use).

Hide the wrong one? Don't worry — your hidden choices are reversible.
The Settings panel + ⌘ P command palette (landing in v0.2.34) read
the full manifest regardless of hidden state, so every sample stays
discoverable forever even if you've hidden them all.

The new `samples` store slice exposes `hideSample(id)`, `showSample(id)`,
`showAllSamples()`, and `setSamplesSectionHidden(bool)`. The whole
section can be collapsed via `setSamplesSectionHidden(true)` — the
Settings panel UI for that lands in v0.2.34.

6 new vitest cases cover hide/show idempotency, multi-id state,
showAll reset behaviour, and the section-flag toggle. 408 tests pass.
