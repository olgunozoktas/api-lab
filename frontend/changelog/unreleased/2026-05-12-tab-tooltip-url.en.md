---
title: Tab tooltip shows label + full METHOD URL
date: 2026-05-12
---

Hovering a tab in the strip used to reveal only the truncated label —
not very useful when the visible text was already cut off mid-path.
The tooltip now stacks two lines:

```
GET api.test/users/octocat
GET https://api.test/users/octocat
```

The first line is the same label rendered in the tab. The second
line is the full untruncated `METHOD URL`. If both happen to be the
same (rare: very short URLs), only the single line shows.

Helpful when several tabs share a domain and you need to disambiguate
without clicking each one.
