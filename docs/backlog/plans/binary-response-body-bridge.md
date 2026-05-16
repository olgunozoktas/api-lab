# Plan — Binary response body channel in the curl bridge

For: docs/backlog/P2-2026-05-16-071035-binary-response-body-bridge.md

## Architecture

The zero-native bridge result buffer is **1 MB** (`max_result_bytes` in
`zero-native/src/bridge/root.zig`). 8–16 MB base64 channels are not
possible without a zero-native change — out of scope. The realistic cap
is the bridge buffer itself: `MAX_BINARY_RAW = 720 KB` (base64 → ~960 KB,
leaving ~64 KB for headers + JSON envelope under 1 MB).

### Zig (`src/handlers/http.zig`)

- `isBinaryBody(content_type, body)` — binary when the body fails
  `std.unicode.utf8ValidateSlice`, OR the content-type is an
  unambiguously-binary type (image/* non-svg, audio/*, video/*,
  application/pdf|wasm|zip|octet-stream, font/*). Text/JSON/XML/SVG
  bodies are valid UTF-8 and non-binary CT → stay on the text path with
  zero base64 tax.
- Binary + `body.len <= MAX_BINARY_RAW` → emit `"body"` as base64
  (`std.base64.standard.Encoder`) plus `"body_base64":true`.
- Binary + oversize → emit `"body":""`, `"body_base64":false`,
  `"body_too_large":true` (size_bytes still accurate from curl metrics).
- Text path unchanged — no new field.
- Response-writing extracted to `writeResponseJson` to keep the file
  readable and under the 400-line cap.

### Frontend

- `lib/binaryBody.ts` (new) — `base64ToBytes`, `bytesToText` (lossy
  UTF-8), `base64ToText`.
- `lib/bridge.ts` — `HttpResponse` gains `body_base64?`, `body_too_large?`.
- `lib/sendRequest.ts` `viaNative` — when `body_base64`, carry the raw
  base64 on the snapshot; `body` becomes a best-effort lossy-text render
  for the Raw tab.
- `lib/types.ts` `ResponseSnapshot` — gains `bodyBase64?: string`,
  `bodyTooLarge?: boolean`. Base64 string (not `Uint8Array`) so it
  persists trivially through the IDB store.
- `components/ResponseBody.tsx` — new binary dispatch before the hex
  branch: too-large notice → image `<img>` → audio `<audio>` → video
  `<video>` → pdf (lazy `PdfViewer`) → hex fallback fed real bytes.
- `components/PdfViewer.tsx` (new) — lazy-imported; `pdfjs-dist`
  renders pages to `<canvas>` with prev/next nav. Dynamic import keeps
  pdfjs out of the main bundle (~400 KB-gz separate chunk).
- `lib/hexDump.ts` + `components/HexViewer.tsx` — accept
  `string | Uint8Array` so binary responses hex-dump real bytes.
- `lib/responseDownload.ts` — `downloadBinaryFile` + binary file
  extensions; `downloadResponseBody` gains an optional `bodyBase64` arg.
- Object-URL viewers reuse the `Blob` + `URL.createObjectURL` +
  next-macrotask-revoke pattern from `downloadTextFile`.

## Edge cases

- Empty body — `utf8ValidateSlice("")` is valid → text path.
- Oversize binary — friendly "too large to preview" state, not a
  cryptic `WriteFailed`.
- base64 alphabet (`A-Za-z0-9+/=`) is JSON-safe — still routed through
  `writeJsonString`.
- Object URLs revoked on unmount to avoid leaks.
- PDF worker — Vite bundles `pdfjs-dist` worker via `new URL(...,
  import.meta.url)`; lazy component import gates the whole dep.

## Risks

- Bundle ceiling — pdfjs lazy-loaded, separate chunk; main bundle
  untouched.
- zero-native response-shape change is additive (`body_base64`) — old
  frontend ignoring it still works.

## Tests

- Zig (`http_test.zig`) — `isBinaryBody` UTF-8 + content-type matrix;
  base64 round-trip via the standard decoder.
- Frontend — `binaryBody` decode round-trip; `hexDump` byte-array path;
  `responseDownload` extension map.

## Reuse audit (inline)

- Zig base64/binary detect — CREATE in `http.zig` (no prior use).
- base64 decode helper — CREATE `lib/binaryBody.ts` (only `btoa` used
  today, in auth).
- Object-URL mechanic — REUSE pattern from `lib/responseDownload.ts`;
  EXTEND that file with `downloadBinaryFile`.
- Binary dispatch — EXTEND `ResponseBody.tsx` content-type chain.
- Hex rendering — EXTEND `hexDump`/`HexViewer` for `Uint8Array`.
- PDF — CREATE `PdfViewer.tsx` + `pdfjs-dist` dependency.
- i18n — EXTEND `tr.ts` (source of truth) + `en.ts`.
