/** Olgun Özoktaş geliştirdi · API Lab */
// Classic `hexdump -C` style formatter for response bodies whose
// content type has no richer viewer (octet-stream, unknown binary).
//
// Accepts either a string (text/latin1 payloads — each character's
// low byte is the unit shown) or a `Uint8Array` (faithful bytes from
// the bridge's base64 binary channel).

// Cap so a multi-megabyte response can't freeze the renderer. The
// caller compares against the body length to show a "truncated" note.
export const HEXDUMP_DEFAULT_LIMIT = 16384;

export function hexDump(
  body: string | Uint8Array,
  maxBytes: number = HEXDUMP_DEFAULT_LIMIT
): string {
  const isBytes = typeof body !== "string";
  const total = isBytes ? body.length : body.length;
  const len = Math.min(total, maxBytes);
  const byteAt = (pos: number): number => (isBytes ? body[pos] : body.charCodeAt(pos) & 0xff);
  const lines: string[] = [];
  for (let i = 0; i < len; i += 16) {
    const offset = i.toString(16).padStart(8, "0");
    let hex = "";
    let ascii = "";
    for (let j = 0; j < 16; j++) {
      // Two 8-byte groups, split by an extra space — the canonical layout.
      if (j === 8) hex += " ";
      const pos = i + j;
      if (pos < len) {
        const code = byteAt(pos);
        hex += code.toString(16).padStart(2, "0") + " ";
        ascii += code >= 0x20 && code < 0x7f ? String.fromCharCode(code) : ".";
      } else {
        hex += "   ";
      }
    }
    lines.push(`${offset}  ${hex} |${ascii}|`);
  }
  return lines.join("\n");
}
