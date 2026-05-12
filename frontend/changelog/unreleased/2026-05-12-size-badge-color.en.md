---
title: Response size badge is now color-coded too
date: 2026-05-12
---

The payload-size pill next to the timing badge now uses the same
perceptual-band colour signal we just shipped for elapsed time:

- **Muted grey** under 100 KB — tiny / normal.
- **Orange** at 100 KB – 1 MB — large; worth noticing.
- **Red** at 1 MB or more — huge; possible code smell.

Hover the badge to see which band the payload landed in plus the
exact byte count. Both the timing pill and the size pill now agree
visually, so a single glance at the response header tells you "fast
or slow" and "small or heavy" in one beat.
