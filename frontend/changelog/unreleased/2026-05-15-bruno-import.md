---
title: Bruno .bru files import into Collections
date: 2026-05-15
---

The sidebar **Import** button now accepts **Bruno `.bru` request
files** alongside Postman v2.1, Insomnia v4, and HAR. Bruno is
auto-detected from the file's block structure — no JSON shape to
peek at, since `.bru` is Bruno's own plain-text format.

Bruno stores each request as a single block-structured `.bru` file
(`meta { … }`, `post { … }`, `headers { … }`, `body:json { … }`,
and so on). This import reads one `.bru` request at a time and adds
it to your Collections tree.

What's mapped: the request name, HTTP method + URL, headers and
query params (including Bruno's `~`-prefixed disabled entries),
bearer / basic / API-key auth, and JSON / text / XML bodies.

What's skipped, each with a warning in the developer console:
GraphQL / multipart / form-urlencoded bodies, path params, and
OAuth2 / AWS-v4 / digest auth — the same surfaces the Postman and
Insomnia importers already defer.

Bruno collections are normally a *directory* of `.bru` files;
this first version imports a single file at a time. Multi-file
(whole-folder) import is a planned follow-up.

This completes Phase E imports — Postman, Insomnia, HAR, and Bruno
are now all supported.
