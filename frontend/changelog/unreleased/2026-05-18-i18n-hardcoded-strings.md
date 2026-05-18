---
title: Localize the last remaining hardcoded UI strings
date: 2026-05-18
---

A few user-facing strings were still hardcoded English instead of
going through the translation layer. The XML tree view's
expand/collapse buttons and the tab strip's per-tab "last response"
label now translate — so a Turkish screen-reader user hears Turkish,
not English.

Three components (the samples list, tab strip, and XML tree view)
also had English fallback defaults baked into their code; those are
gone, leaving translation the single source for every label.
