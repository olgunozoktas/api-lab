# Phase E.4 — Binary response body channel in the curl bridge

Priority: P2

## Context

`ResponseSnapshot.body` is a `string`, and the curl bridge handler
serialises the response body as text. Binary payloads — images,
audio, video, PDFs, protobuf frames — arrive mangled: non-UTF-8
bytes become U+FFFD replacement chars, so the original bytes can't
be recovered frontend-side.

This single gap blocks a cluster of already-half-built features:

- **Response viewers** (`P2-2026-05-09-170900`, partial ship
  2026-05-15) — image / audio / video / PDF preview items (3-6)
  are deferred *solely* because there are no faithful bytes to feed
  an `<img>` / `<audio>` / `<video>` / pdf.js. SVG + HTML + JSON +
  hex + XML already shipped because they're text.
- **Multipart + binary request body** (`P2-2026-05-09-170700`) —
  the *response* side of binary; the request side has the mirror
  problem.
- **Response download** — `downloadResponseBody` blobs `r.body` as
  a string, so downloading a binary response today saves corrupted
  bytes.

It's a bridge-contract change (native Zig + frontend), which is why
it was split out rather than folded into the viewer slice.

## Items

- [x] `src/handlers/http.zig` — detect a binary response body
  (content-type not text/json/xml/svg, OR body fails a UTF-8
  validity check). For binary, return the body **base64-encoded**
  plus a `body_base64: true` flag in the JSON response (text bodies
  unchanged — no base64 tax on the common path).
- [x] Bridge contract — document the new `body_base64` field in
  `src/main.zig`'s handler comment + the `http.request` response
  shape.
- [x] Frontend `lib/bridge.ts` / `lib/sendRequest.ts` — when
  `body_base64` is set, decode to bytes; carry them on
  `ResponseSnapshot` (e.g. `bodyBytes?: Uint8Array` or keep base64
  + decode lazily at the viewer). Keep `body` populated with a
  best-effort text rendering for the Raw tab.
- [x] Response viewers (`components/ResponseBody.tsx`) — image
  (`<img>`), audio (`<audio>`), video (`<video>`) via an object URL
  built from a Blob of the decoded bytes. PDF via lazy-loaded
  `pdfjs-dist`. Closes items 3-6 of `P2-2026-05-09-170900`.
- [x] `downloadResponseBody` — download the real bytes for binary
  responses, not the mangled string.
- [x] Size cap — base64 inflates ~33%; cap the channel (e.g. 8-16 MB)
  and surface a "response too large to preview" state past it.
- [x] Tests — Zig: UTF-8 detection + base64 round-trip on the
  handler. Frontend: `body_base64` decode path, viewer dispatch.

## Acceptance

`GET` a GitHub avatar (PNG) → the Body tab shows the image. `GET`
a PDF → pdf.js renders the first page. `GET` an MP3 → an audio
player. Downloading any of them saves a byte-identical file.

## Tradeoffs

- Base64 in the JSON response inflates binary payloads ~33% over the
  bridge — acceptable for an API tester (responses are bounded by
  the size cap), and only binary bodies pay it.
- Detecting "is this binary" by content-type + a UTF-8 check is a
  heuristic; a text response mislabelled `octet-stream` would be
  base64'd unnecessarily (harmless — just the 33% tax).
- Touches the zero-native bridge response shape. It's an additive
  field (`body_base64`), so old frontend code ignoring it still
  works — no lock-step deploy needed.

## How to work on this

1. Read `src/handlers/http.zig` (the existing curl handler) and the
   `http.request` response shape in `src/main.zig`.
2. Zig 0.16: a UTF-8 validity check is `std.unicode.utf8ValidateSlice`.
   Base64 via `std.base64.standard.Encoder`.
3. Frontend: `atob` + `Uint8Array` for decode; `new Blob([bytes],
   {type})` + `URL.createObjectURL` for the viewers (mirror the
   `downloadTextFile` object-URL pattern in `lib/responseDownload.ts`).
4. pdf.js: `pdfjs-dist` `getDocument` → render page to a `<canvas>`;
   dynamic-import it so the ~400 KB stays out of the main bundle.
5. After this lands, reopen `P2-2026-05-09-170900` items 3-6 and the
   binary half of `P2-2026-05-09-170700`.
