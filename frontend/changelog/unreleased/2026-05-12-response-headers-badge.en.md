---
title: Response Headers tab now shows the header count too
date: 2026-05-12
---

The response viewer's Examples tab already carried a count badge
when you had saved examples. The Headers tab now mirrors that — a
small `N` chip appears next to the label whenever the response
came back with at least one header, so you know the size of the
header block without switching to it.

Pairs with the composer Params/Headers count badges shipped in
v0.2.9: every tab strip in the app now follows the same "carry the
count if it isn't empty" rule.
