---
title: Multipart form-data + binary file uploads
date: 2026-05-17
---

The request body editor gains two new modes for file uploads.

**multipart/form-data** — build a form field-by-field. Each field is
either an inline text value or a file picked from disk (toggle with
the paperclip button). API Lab sends it as a real multipart request,
so endpoints that take image uploads, document parsing, or ML
inference now work directly.

**Binary** — pick a single file and send it as the raw request body.
The `Content-Type` is filled in from the file extension automatically
(override it in the Headers tab if you need to).

Files are read straight off disk by the native HTTP path — a 10 MB
upload never has to pass through the app's JS bridge — so large files
upload cleanly. File uploads require the desktop app (a browser can't
read local file paths).
