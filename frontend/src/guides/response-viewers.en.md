---
title: Response viewers — images, audio, video, PDF
group: Composer
order: 6
---

When a response isn't text, API Lab previews it instead of
mangling the bytes into replacement characters. The native request
bridge carries binary responses intact, and the **Body** tab picks
the right viewer automatically.

## What renders

| Response type                          | Viewer                      |
| -------------------------------------- | --------------------------- |
| Images (PNG, JPEG, GIF, WebP, AVIF, …) | Inline image                |
| Audio                                  | Playback bar                |
| Video                                  | Inline player               |
| PDF                                    | Page-by-page, prev / next   |
| Anything else binary                   | Hex viewer (faithful bytes) |

The viewer is chosen from the response's `Content-Type` plus a
sniff of the bytes, so a mislabelled response still lands in the
right place.

## Downloading

Downloading a binary response saves a **byte-identical** file —
open a saved PNG or PDF and it just works.

## The size cap

The native bridge carries binary bodies up to ~720 KB. A larger
binary response shows a clear "too large to preview" notice rather
than failing silently — the request still succeeded; only the
in-app preview is capped.
