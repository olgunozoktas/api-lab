/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { hexDump, HEXDUMP_DEFAULT_LIMIT } from "../hexDump";

describe("hexDump", () => {
  it("formats a short string with offset, hex, and ASCII columns", () => {
    const out = hexDump("Hello");
    expect(out.startsWith("00000000  48 65 6c 6c 6f ")).toBe(true);
    expect(out.endsWith("|Hello|")).toBe(true);
  });

  it("renders printable ASCII verbatim and non-printable as a dot", () => {
    const out = hexDump("a\tb\n");
    // tab (0x09) and newline (0x0a) are non-printable → dots in the ASCII gutter
    expect(out).toContain("|a.b.|");
    expect(out).toContain("61 09 62 0a");
  });

  it("emits one line per 16 bytes with an incrementing offset", () => {
    const lines = hexDump("x".repeat(40)).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0].startsWith("00000000  ")).toBe(true);
    expect(lines[1].startsWith("00000010  ")).toBe(true);
    expect(lines[2].startsWith("00000020  ")).toBe(true);
  });

  it("splits the hex column into two 8-byte groups", () => {
    const out = hexDump("0123456789abcdef");
    // 8 bytes, an extra space, then 8 more
    expect(out).toContain("30 31 32 33 34 35 36 37  38 39 61 62 63 64 65 66");
  });

  it("caps output at maxBytes", () => {
    const out = hexDump("z".repeat(100), 16);
    expect(out.split("\n")).toHaveLength(1);
  });

  it("returns an empty string for empty input", () => {
    expect(hexDump("")).toBe("");
  });

  it("uses the low byte of each char code", () => {
    // 'Ā' is U+0100; low byte is 0x00
    expect(hexDump("Ā")).toContain("00000000  00 ");
    expect(HEXDUMP_DEFAULT_LIMIT).toBe(16384);
  });
});
