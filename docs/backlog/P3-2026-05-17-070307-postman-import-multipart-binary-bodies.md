# Map Postman formdata / file bodies to multipart + binary on import

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-170700-multipart-and-binary-body.md`
(shipped 2026-05-17). That slice added `multipart` and `binary` body
modes. The Postman v2.1 importer (`frontend/src/lib/importers/postmanV2.ts`)
predates them — its body-mode switch only handles `raw` / `urlencoded`
and falls back to `{mode:"none"}` for anything else. A Postman
collection that uses `formdata` or `file` request bodies therefore
imports with its body silently dropped.

Now that API Lab has first-class `multipart` + `binary` modes, the
importer should map into them.

## Items

- [ ] In `postmanV2.ts`, map a Postman `formdata` body to
  `{mode:"multipart", parts:[...]}` — each Postman formdata entry
  becomes a `MultipartField` (`type:"text"` → text field,
  `type:"file"` → file field with `filePath` from the entry's `src`).
- [ ] Map a Postman `file` body to `{mode:"binary", filePath, fileName}`
  from the entry's `src` path.
- [ ] Round-trip check: importing a collection that uses these body
  modes preserves them; the other importers (Insomnia / Bruno / HAR)
  get the same treatment if they carry equivalent shapes.
- [ ] Tests in `postmanV2.test.ts` covering both mappings.

## Acceptance

Importing a Postman collection whose requests use `formdata` (with a
file part) and `file` bodies yields API Lab requests in `multipart` /
`binary` mode with the fields + paths populated — no silent body loss.

## Tradeoffs

- Postman stores file `src` as a path that was valid on the exporting
  machine; on import that path may not exist locally. Import it as-is
  (the user re-picks if needed) rather than dropping it.

## How to work on this

1. `frontend/src/lib/importers/postmanV2.ts` — the body switch is
   around the `mapBody` helper.
2. Reuse the `MultipartField` shape + `emptyMultipartField()` from
   `frontend/src/lib/types.ts`.

## Reference

- Parent: `docs/backlog/done/P2-2026-05-09-170700-multipart-and-binary-body.md`
