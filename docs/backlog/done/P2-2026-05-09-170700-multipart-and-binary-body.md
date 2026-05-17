# Phase E.1 — Multipart form-data + binary body

Priority: P2

## Context

Body modes today: none / json / form (urlencoded) / raw. Missing:
multipart with file picker (huge chunk of real APIs use this for
uploads — image hosting, doc parsing, ML inference) and raw binary.

Plan reference: `docs/plans/piped-dazzling-pretzel.md` § Phase E.1.

## Items

- [x] Extend `Body.mode` type with `"multipart"` and `"binary"`
- [x] Multipart UI: KvTable variant where value can be either text or a file picker (lucide `Paperclip` icon for the toggle)
- [x] Binary UI: single file picker, shows filename + size + content-type
- [x] Native file picker: new bridge command `dialog.openFile({multiple?, accept?}) -> [{path, name, size, contentType}]`
- [x] Send path: build `FormData` for multipart, `Blob` for binary; thread through both `viaNative` (Zig curl) and `viaFetch` (browser)
- [x] Zig handler: read file from disk (per `path`), append to curl's `-F` for multipart or `--data-binary @path` for binary
- [x] Tests: builders produce the right shape

## Acceptance

Upload an image to a real API endpoint (httpbin.org/post or similar)
via multipart; upload a 10 MB binary via raw body; both succeed.

## Tradeoffs

File picker requires a new bridge command — needs zero-native side
work. macOS NSOpenPanel is straightforward; Linux/Windows different
APIs (deferred until Phase N).

## How to work on this

1. Read `frontend/src/components/BodyPanel.tsx` for the current
   body mode UI pattern.
2. Read `~/Herd/zero-native/src/platform/macos/appkit_host.m` for
   how to extend with NSOpenPanel.
3. Extend `lib/sendRequest.ts:buildBody` for the new modes.
