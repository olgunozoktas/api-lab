---
title: Body modes — JSON, form, raw, multipart, binary
group: Composer
order: 3
---

The **Body** sub-tab in the composer offers six modes:

| Mode                    | Sends as                            | Editor                     |
| ----------------------- | ----------------------------------- | -------------------------- |
| `Yok / None`            | (no body)                           | —                          |
| `JSON`                  | `application/json`                  | CodeMirror, JSON-validated |
| `x-www-form-urlencoded` | `application/x-www-form-urlencoded` | KV table                   |
| `multipart/form-data`   | `multipart/form-data`               | Field table + file picker  |
| `Binary`                | the file's type (from extension)    | Single file picker         |
| `Raw`                   | what you set in `Content-Type`      | CodeMirror plain           |

## JSON mode

The CodeMirror 6 editor with JSON syntax highlighting. **Pretty
Format** reindents in place — useful after a paste. The validation
error pill shows line + column for malformed JSON, and the request
won't send until it parses.

`{{var}}` substitution runs over the JSON text _after_ validation, so
your variable values can include quotes, escapes, or any character —
they land verbatim into the bytes that hit the wire.

## Form-urlencoded mode

A KV table with **+ Param ekle / + Add param** at the bottom. Each
row has an enable checkbox (uncheck to skip without deleting).
Param values are URL-encoded automatically; `{{var}}` substitution
happens before encoding.

## multipart/form-data

For file uploads and mixed form posts. Build the body field by
field: each row is a name plus either an inline text value or a
file from disk — toggle a row between the two with the **paperclip**
button. API Lab sends a real multipart request; curl owns the
`multipart/form-data` boundary, so don't set a `Content-Type`
header yourself.

## Binary

Pick a single file from disk and send it as the raw request body —
for image hosts, document parsers, S3 `PUT`, and the like. The
`Content-Type` is filled in from the file extension automatically;
override it in the **Headers** sub-tab if you need to.

File parts (multipart files + binary bodies) are read straight off
disk by the native request path, so a large upload never has to
pass through the app's JS bridge. File uploads need the desktop
app — a browser can't read local file paths.

## Raw mode

For everything else — XML, CSV, custom formats, etc. The
`Content-Type` header (set in the **Headers** sub-tab) determines
how the server interprets the body. Raw mode is also handy for
edge cases like sending an empty `{}` JSON body when JSON mode's
validator is too strict.

## What persists

The body content is part of the request snapshot. When you `⌘ S`
save, the body persists with the rest of the request and reloads
identically next session.
