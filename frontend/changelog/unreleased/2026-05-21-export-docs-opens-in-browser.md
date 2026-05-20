---
title: Export HTML now opens the docs in your default browser
date: 2026-05-21
---

The **Export HTML** button in the OpenAPI editor's docs view used to
download the Redoc bundle as a file — leaving you to find it in
Downloads and double-click it. It now stages the bundle into a
short-lived cache directory (`~/Library/Caches/API Lab/exports/<rand>/`)
and asks the OS to open the `file://` URL directly, so the rendered
docs appear in your default browser the moment you click.

If the bridge can't stage the file (running under `dnpm run dev` in
the browser, or the cache directory can't be written), the button
falls back to the original download flow — same outcome, just one
extra click.

Behind the scenes:

- A new `shell.writeTempFile` bridge command stages files only under
  the cache-exports root. The filename is validated as a plain
  basename (no slashes, no `..`); the handler picks the random
  subdir.
- `shell.open` was extended to accept `file://` URLs whose path is
  under that same cache root — anything outside (including
  `..`-traversal attempts) still gets rejected with
  `invalid_url_scheme`.
- Content cap: 8 MB per stage, comfortably above what a Redoc
  bundle needs.
