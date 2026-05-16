/** Olgun Özoktaş geliştirdi · API Lab */
// Classic `hexdump -C` style formatter for response bodies whose
// content type has no richer viewer (octet-stream, unknown binary).
//
// The response body reaches us as a string, so each character's
// low byte (`charCodeAt & 0xff`) is the unit shown — faithful for
// text/latin1 payloads, lossy for true multi-byte binary (the bridge
// would need a binary channel for that — tracked as a follow-up).

// Cap so a multi-megabyte response can't freeze the renderer. The
// caller compares against `text.length` to show a "truncated" note.
export const HEXDUMP_DEFAULT_LIMIT = 16384;

export function hexDump(text: string, maxBytes: number = HEXDUMP_DEFAULT_LIMIT): string {
  const len = Math.min(text.length, maxBytes);
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
        const code = text.charCodeAt(pos) & 0xff;
        hex += code.toString(16).padStart(2, "0") + " ";
        ascii += code >= 0x20 && code < 0x7f ? text[pos] : ".";
      } else {
        hex += "   ";
      }
    }
    lines.push(`${offset}  ${hex} |${ascii}|`);
  }
  return lines.join("\n");
}
