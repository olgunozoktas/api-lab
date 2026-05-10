---
title: Body modes — JSON, form-encoded, raw
group: Composer
order: 3
---

The **Body** sub-tab in the composer offers four modes:

| Mode                    | Sends as                            | Editor                     |
| ----------------------- | ----------------------------------- | -------------------------- |
| `Yok / None`            | (no body)                           | —                          |
| `JSON`                  | `application/json`                  | CodeMirror, JSON-validated |
| `x-www-form-urlencoded` | `application/x-www-form-urlencoded` | KV table                   |
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

## Raw mode

For everything else — XML, CSV, multipart fragments, etc. The
`Content-Type` header (set in the **Headers** sub-tab) determines
how the server interprets the body. Raw mode is also handy for
edge cases like sending an empty `{}` JSON body when JSON mode's
validator is too strict.

## What persists

The body content is part of the request snapshot. When you `⌘ S`
save, the body persists with the rest of the request and reloads
identically next session.
