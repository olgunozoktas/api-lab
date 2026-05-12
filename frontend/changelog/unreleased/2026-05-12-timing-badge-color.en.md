---
title: Response timing badge is now color-coded
date: 2026-05-12
---

The "X ms" elapsed-time badge next to the response status pill now
shifts color based on a perceptual band so you can spot slow
responses at a glance:

- **Green** under 200 ms — feels instant.
- **Muted grey** 200–700 ms — normal.
- **Orange** 700 ms – 2 s — noticeably slow.
- **Red** at 2 s or more — broken-feeling.

Hover the badge to see which band the response landed in plus the
full DNS / TCP / TTFB / total breakdown that was already there.
