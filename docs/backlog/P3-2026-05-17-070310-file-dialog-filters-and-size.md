# File dialog: type filters + show picked file size

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-09-170700-multipart-and-binary-body.md`
(shipped 2026-05-17). The multipart/binary file pickers reuse
zero-native's builtin `zero-native.dialog.openFile` command. That
command currently (a) ignores file-type filters — its payload parser
reads only `title` / `defaultPath` / `allowDirectories` /
`allowMultiple`, so picking "an image" shows every file — and (b)
returns bare paths, so the binary-body UI shows the file name +
content-type but not its size.

Both are nice-to-haves the parent slice deliberately deferred.

## Items

- [ ] **Type filters.** Teach `zero-native.dialog.openFile` (in the
  zero-native `runtime` + `OpenDialogOptions`) to accept a `filters`
  array, and pass an `accept` hint from `pickFiles` in
  `frontend/src/lib/fileBody.ts` (e.g. images for an image field).
  This needs a zero-native change — coordinate there.
- [ ] **File size.** Add a small `fs.stat({path}) -> {exists, size}`
  bridge handler (new `src/handlers/fs.zig`, mirrors the `http.zig`
  Context pattern; `filesystem` permission). `BodyBinary` and the
  multipart file rows then show a human-readable size.
- [ ] Tests for the matcher / stat handler + the size formatting.

## Acceptance

The native file picker can be constrained to a file type, and the
binary-body panel shows the picked file's size alongside its name and
content-type.

## Tradeoffs

- The filter half needs an upstream zero-native change; if that is not
  desirable, the `fs.stat` size half is independently shippable.

## How to work on this

1. `zero-native/src/runtime/root.zig` `openFileDialogFromJson` is where
   the dialog payload is parsed — `filters` would be added there.
2. `src/handlers/http.zig` is the Context + handler-factory pattern a
   new `fs.zig` stat handler would copy.

## Reference

- Parent: `docs/backlog/done/P2-2026-05-09-170700-multipart-and-binary-body.md`
- Dialog command: `zero-native/src/runtime/root.zig` (`zero-native.dialog.openFile`)
