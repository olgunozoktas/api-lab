---
title: Preview binary responses — images, audio, video and PDFs
date: 2026-05-16
---

API Lab can now show binary responses instead of mangling them. The
native request bridge gained a binary channel: when a response is an
image, audio clip, video, PDF — or anything else that isn't text — its
bytes travel intact instead of being garbled into replacement
characters.

The Body tab picks the right viewer automatically:

- **Images** (PNG, JPEG, GIF, WebP, AVIF, …) render inline.
- **Audio** responses get a playback bar.
- **Video** responses get an inline player.
- **PDFs** render page-by-page with previous/next navigation.
- Anything else binary falls back to the hex viewer, now fed faithful
  bytes rather than a lossy text approximation.

Downloading a binary response now saves a byte-identical file — open a
saved PNG or PDF and it just works. Responses larger than the bridge's
720 KB binary cap show a clear "too large to preview" notice instead
of failing silently.
