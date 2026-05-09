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

- [ ] Content-type-aware viewer dispatch in `frontend/src/components/ResponseBody.tsx`
- [ ] HTML preview: sandboxed iframe (`sandbox=""`, no scripts, strict CSP) — shows the rendered HTML safely
- [ ] Image preview: PNG / JPG / WebP / AVIF / GIF / SVG via `<img>` with object URL from response Blob
- [ ] PDF preview: lazy-load `pdf.js` (dynamic import — Phase O.0 prerequisite) — render first 3 pages with paginator
- [ ] Audio: `<audio controls>` with object URL
- [ ] Video: `<video controls>` with object URL
- [ ] Hex viewer: byte-grid view for unknown content types (offset / hex / ASCII columns)
- [ ] XML tree view: same `@uiw/react-json-view` pattern but for parsed XML
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
