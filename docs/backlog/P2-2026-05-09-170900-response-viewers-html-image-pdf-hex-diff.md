# Phase E.3 — Rich response viewers (HTML, image, PDF, hex, diff)

Priority: P2

## Context

Today we render JSON via `@uiw/react-json-view`. Everything else
falls through to raw text. Real APIs return images (Stripe receipts,
DALL·E outputs), HTML (legacy SOAP, scraping APIs), PDFs (invoices),
binary frames (protobuf). Without rich viewers, users hop to
external tools to see the response — defeats the "single workspace"
promise.

## Items

- [x] Content-type-aware viewer dispatch in `frontend/src/components/ResponseBody.tsx`
- [x] HTML preview: sandboxed iframe (`sandbox=""`, no scripts, strict CSP) — shows the rendered HTML safely
- [x] Image preview: PNG / JPG / WebP / AVIF / GIF / SVG via `<img>` with object URL from response Blob — raster formats now ship via the base64 binary channel (`P2-2026-05-16-071035`)
- [x] PDF preview: lazy-load `pdf.js` (dynamic import) — page-by-page render with prev/next paginator, shipped via the binary channel (`P2-2026-05-16-071035`)
- [x] Audio: `<audio controls>` with object URL
- [x] Video: `<video controls>` with object URL
- [x] Hex viewer: byte-grid view for unknown content types (offset / hex / ASCII columns)
- [x] XML tree view: collapsible element tree (DOMParser-based; the `@uiw/react-json-view` pattern is JSON-only)
- [ ] Response diff: pick two history entries OR two open tabs, render side-by-side diff (json-diff for JSON, line-diff for text)

## Acceptance

GET on a Stripe receipt PDF renders the first page. GET on a
GitHub avatar shows the image. GET on a SOAP service shows
formatted XML tree. Diff view between two JSON responses
highlights changed keys.

## Tradeoffs

pdf.js adds ~400 KB; lazy-load mandatory. HTML in iframe is the
safe default but can't run JS so dynamic SPAs render statically.

## How to work on this

1. Read `frontend/src/components/ResponseViewer.tsx` for the
   existing viewer pattern.
2. pdf.js: use `pdfjs-dist` with `getDocument` + page render to
   canvas.
3. Diff: use `diff-match-patch` for line-diff or `microdiff` for
   JSON.

## Partial ship — 2026-05-15 (UTC)

Shipped 4 of 9 items as **v0.2.45**: content-type dispatch, HTML
preview (was already live from an earlier slice), the hex viewer,
and the XML tree view.

**What landed:**

- `lib/hexDump.ts` — `hexdump -C`-style formatter (offset / two
  8-byte hex groups / ASCII gutter), capped at 16 KB. 7 vitest cases.
- `components/HexViewer.tsx` — renders the dump; triggers for
  `application/octet-stream` and `*binary*` content types.
- `components/XmlTreeView.tsx` — `DOMParser`-based collapsible
  element tree (attributes + leaf text colour-coded; malformed XML
  flagged). Triggers for `application/xml` / `text/xml` / `+xml`.
- `ResponseBody.tsx` gained the XML + hex dispatch branches.

**Deferred — and why:**

- **Image / Audio / Video / PDF previews (items 3-6).** All need the
  response's raw *binary* bytes, but `ResponseSnapshot.body` is a
  `string` — the curl bridge serialises the body as text, so binary
  payloads arrive mangled (non-UTF-8 bytes become replacement
  chars). A faithful `<img>` / `<audio>` / `<video>` / pdf.js source
  needs the bridge to carry a binary channel (base64 field or
  similar). That's a bridge-contract change — same class of work as
  the multipart-binary-body item. SVG already works because SVG is
  text. **Follow-up: a bridge change to carry binary response bodies
  is the prerequisite for items 3-6.**
- **Response diff (item 9).** Needs a "pick two responses" UX
  (two history entries / two open tabs) which is its own surface,
  plus a diff library. Deferred to keep this slice cohesive.
