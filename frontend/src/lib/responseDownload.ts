/** Olgun Özoktaş geliştirdi · API Lab */
// Pick a sensible file extension from the response's Content-Type
// header. Order matters: more specific MIME types come first so e.g.
// `application/vnd.api+json` lands on `.json` rather than the
// generic `.bin` fallback. Unknown / empty types fall back to `.txt`.
export function extensionForContentType(contentType: string): string {
  const t = contentType.toLowerCase();
  if (t.includes("application/json") || t.includes("+json")) return "json";
  if (t.includes("text/html")) return "html";
  if (t.includes("image/svg")) return "svg";
  if (t.includes("application/xml") || t.includes("text/xml") || t.includes("+xml")) return "xml";
  if (t.includes("text/csv")) return "csv";
  if (t.includes("text/markdown")) return "md";
  if (t.includes("text/yaml") || t.includes("application/yaml")) return "yaml";
  if (t.includes("application/javascript") || t.includes("text/javascript")) return "js";
  if (t.includes("text/css")) return "css";
  if (t.includes("text/plain")) return "txt";
  if (t.startsWith("text/")) return "txt";
  return "txt";
}

// Trigger a browser download of arbitrary text content. The shared
// blob-anchor mechanic behind `downloadResponseBody` and the OpenAPI
// editor's Save button.
//
// Side effects only — caller doesn't get a promise. The anchor click +
// URL revoke happens on the next macrotask via a tiny setTimeout so
// the click event dispatches before the URL is freed.
export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  // The Blob carries the real MIME type so Finder / the dock show the
  // right icon for the saved file.
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 0ms timeout pushes the revoke to the next macrotask so Safari's
  // download pipeline has time to read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Trigger a browser download of the response body. Filename includes
// the status code so saved files from chained debug sessions don't
// stomp each other (`response-200.json`, `response-404.html`, etc.).
export function downloadResponseBody(body: string, contentType: string, status: number): void {
  const ext = extensionForContentType(contentType);
  downloadTextFile(body, `response-${status || "unknown"}.${ext}`, contentType || "text/plain");
}
