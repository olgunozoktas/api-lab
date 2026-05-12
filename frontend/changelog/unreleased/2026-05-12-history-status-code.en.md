---
title: History rows now show the actual status code, not just a dot
date: 2026-05-12
---

The status indicator on each history entry used to be a tiny coloured
dot. Now it's a small `200` / `404` / `500` chip with the same
class-coloured background — the colour signal is preserved, but you
also see the exact code without having to replay the request. Hover
the chip for the full status text (e.g. `404 Not Found`).

Combined with the elapsed-time chip shipped in v0.2.10, the right
edge of every history row now answers "how fast?" and "what did it
return?" in two glanceable pills.
