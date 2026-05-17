/** Olgun Özoktaş geliştirdi · API Lab */
// Helpers for the multipart/form-data + raw-binary body modes.
//
// The native file dialog is zero-native's builtin
// `zero-native.dialog.openFile` bridge command (enabled via the
// builtin-bridge policy in src/main.zig). It returns an array of
// absolute paths, or null when the user cancels. The Zig `http.zig`
// handler turns the picked paths into curl `-F name=@path` (multipart)
// or `--data-binary @path` (binary) arguments — curl does the file I/O.

import { bridge } from "./bridge";
import { envSubst } from "./utils";
import type { Body, MultipartField } from "./types";

// One multipart field on the wire to the Zig handler. `is_file` tells
// the handler whether `value` is inline text or a path to `@`-load.
export type MultipartWire = { name: string; value: string; is_file: boolean };

// Basename of a path — handles both POSIX and Windows separators so a
// path picked on either platform displays cleanly. Pure.
export function basename(path: string): string {
  const trimmed = path.replace(/[/\\]+$/, "");
  const idx = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}

// Extension → MIME content type. Covers the common upload types; an
// unknown extension falls back to application/octet-stream. Pure.
const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  json: "application/json",
  xml: "application/xml",
  txt: "text/plain",
  csv: "text/csv",
  html: "text/html",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  wav: "audio/wav",
  woff2: "font/woff2",
  wasm: "application/wasm",
};

export function contentTypeForPath(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  const ext = name.slice(dot + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

// Open the native file picker. Returns the picked absolute paths, or
// an empty array when the user cancels or the bridge is unavailable.
export async function pickFiles(multiple = false): Promise<string[]> {
  if (!bridge.available) return [];
  const result = await bridge.invoke<string[] | null>("zero-native.dialog.openFile", {
    allowMultiple: multiple,
  });
  return Array.isArray(result) ? result : [];
}

// Build the multipart wire payload from the body's fields. Disabled
// or unnamed fields are dropped; file fields with no picked path are
// dropped too (an empty `@` arg would make curl fail). Env vars are
// substituted into field names and text values. Pure.
export function buildMultipartWire(
  parts: MultipartField[] | undefined,
  vars: Record<string, string>
): MultipartWire[] {
  if (!parts) return [];
  const out: MultipartWire[] = [];
  for (const p of parts) {
    if (!p.enabled || !p.k.trim()) continue;
    if (p.kind === "file") {
      if (!p.filePath) continue;
      out.push({ name: envSubst(p.k, vars), value: p.filePath, is_file: true });
    } else {
      out.push({ name: envSubst(p.k, vars), value: envSubst(p.v, vars), is_file: false });
    }
  }
  return out;
}

// The binary body's file path, or undefined when none is picked. Pure.
export function binaryPath(body: Body): string | undefined {
  if (body.mode !== "binary") return undefined;
  return body.filePath && body.filePath.length > 0 ? body.filePath : undefined;
}
