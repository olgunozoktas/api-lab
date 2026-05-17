/** Olgun Özoktaş geliştirdi · API Lab */
//
// Builds a portable, single-file Redoc HTML page from a parsed
// OpenAPI document. The spec is inlined as JSON; Redoc's standalone
// bundle is pulled from its CDN at open time.
//
// Note on scope: the K.3 backlog asked to "write a self-contained
// HTML to a temp file + open the system browser". api-lab has no
// filesystem-write or open-browser bridge, and a truly offline
// self-contained page would have to inline Redoc's ~1 MB bundle. So
// this ships the pragmatic form — a standard, portable Redoc page
// that the user downloads and opens themselves. The CDN reference is
// the one online dependency.

const REDOC_CDN = "https://cdn.redocly.com/redoc/latest/bundles/redoc.standalone.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build the HTML. The inlined spec JSON has `<` escaped to `<` so
// a string containing `</script>` can't break out of the script tag.
export function buildRedocHtml(spec: object, title: string): string {
  const specJson = JSON.stringify(spec).replace(/</g, "\\u003c");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <div id="redoc-container"></div>
    <script>window.__APILAB_SPEC__ = ${specJson};</script>
    <script src="${REDOC_CDN}"></script>
    <script>
      Redoc.init(window.__APILAB_SPEC__, {}, document.getElementById("redoc-container"));
    </script>
  </body>
</html>
`;
}
