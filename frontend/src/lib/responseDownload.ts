/** Olgun Özoktaş geliştirdi · API Lab */
import { base64ToBytes } from "./binaryBody";

// Pick a sensible file extension from the response's Content-Type
// header. Order matters: more specific MIME types come first so e.g.
// `application/vnd.api+json` lands on `.json` rather than the
// generic fallback. Unknown text types fall back to `.txt`, unknown
// binary types to `.bin`.
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
  // Binary types — the base64 channel preserves these byte-for-byte.
  if (t.includes("image/png")) return "png";
  if (t.includes("image/jpeg") || t.includes("image/jpg")) return "jpg";
  if (t.includes("image/gif")) return "gif";
  if (t.includes("image/webp")) return "webp";
  if (t.includes("image/avif")) return "avif";
  if (t.includes("image/x-icon") || t.includes("image/vnd.microsoft.icon")) return "ico";
  if (t.includes("image/")) return "img";
  if (t.includes("audio/mpeg")) return "mp3";
  if (t.includes("audio/wav") || t.includes("audio/x-wav")) return "wav";
  if (t.includes("audio/ogg")) return "ogg";
  if (t.includes("audio/")) return "audio";
  if (t.includes("video/mp4")) return "mp4";
  if (t.includes("video/webm")) return "webm";
  if (t.includes("video/")) return "video";
  if (t.includes("application/pdf")) return "pdf";
  if (t.includes("application/zip")) return "zip";
  if (t.includes("application/gzip")) return "gz";
  if (t.includes("application/wasm")) return "wasm";
  if (t.includes("font/") || t.includes("application/font")) return "font";
  if (t.includes("text/plain") || t.startsWith("text/")) return "txt";
  if (t.includes("application/octet-stream")) return "bin";
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

// Trigger a browser download of raw binary content. Same blob-anchor
// mechanic as `downloadTextFile`, but the Blob carries a `Uint8Array`
// so non-UTF-8 bytes survive byte-for-byte.
export function downloadBinaryFile(
  bytes: Uint8Array<ArrayBuffer>,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Trigger a browser download of the response body. Filename includes
// the status code so saved files from chained debug sessions don't
// stomp each other (`response-200.json`, `response-404.html`, etc.).
//
// When `bodyBase64` is supplied the response came over the binary
// channel — the file is saved from the decoded bytes so images, PDFs,
// audio, etc. round-trip byte-identical instead of from the mangled
// lossy-text `body`.
export function downloadResponseBody(
  body: string,
  contentType: string,
  status: number,
  bodyBase64?: string
): void {
  const ext = extensionForContentType(contentType);
  const filename = `response-${status || "unknown"}.${ext}`;
  if (bodyBase64) {
    downloadBinaryFile(
      base64ToBytes(bodyBase64),
      filename,
      contentType || "application/octet-stream"
    );
    return;
  }
  downloadTextFile(body, filename, contentType || "text/plain");
}
