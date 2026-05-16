/** Olgun Özoktaş geliştirdi · API Lab */
// Helpers for the binary response channel. The native curl handler
// base64-encodes non-text bodies and sets `body_base64: true` (see
// src/handlers/http.zig); the `fetch` fallback transport mirrors that
// here. These helpers turn base64 into raw bytes for the rich viewers
// (image / audio / video / PDF / hex) and a best-effort lossy-UTF-8
// text for the Raw tab.

// Largest raw binary body carried over the channel — mirrors
// `MAX_BINARY_RAW` in src/handlers/http.zig (the zero-native bridge
// result buffer is 1 MB; base64 inflates ~4/3).
export const MAX_BINARY_RAW = 700 * 1024;

// Content types that are unambiguously binary — mirrors the Zig
// handler's `isBinaryContentType`. SVG is intentionally excluded (it
// is XML text and has its own preview path).
const BINARY_CT =
  /^\s*(image\/(?!svg)|audio\/|video\/|font\/|application\/(pdf|octet-stream|wasm|zip|gzip|x-protobuf|x-tar|msword))/i;

export function isBinaryContentType(contentType: string): boolean {
  return BINARY_CT.test(contentType);
}

// Which rich viewer a binary response body should render in, decided
// purely from the content type. `hex` is the catch-all for binary
// payloads with no dedicated preview.
export type BinaryViewerKind = "image" | "audio" | "video" | "pdf" | "hex";

export function pickBinaryViewer(contentType: string): BinaryViewerKind {
  const ct = contentType.toLowerCase();
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("audio/")) return "audio";
  if (ct.startsWith("video/")) return "video";
  if (ct.includes("application/pdf")) return "pdf";
  return "hex";
}

// Decode a standard-alphabet base64 string to its raw bytes.
export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Encode raw bytes to a standard-alphabet base64 string. Chunked so a
// large body doesn't blow the argument limit of String.fromCharCode.
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// Lossy UTF-8 decode — invalid sequences become U+FFFD rather than
// throwing, so a binary body still renders *something* in the Raw tab.
export function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

// Convenience: base64 → lossy text in one hop.
export function base64ToText(b64: string): string {
  return bytesToText(base64ToBytes(b64));
}
