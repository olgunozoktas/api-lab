/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { isWsUrl, tryPrettyJson, looksLikeJson, nextMessageId } from "../ws";

describe("isWsUrl", () => {
  it("accepts ws:// and wss:// (case-insensitive)", () => {
    expect(isWsUrl("ws://x.test")).toBe(true);
    expect(isWsUrl("wss://x.test")).toBe(true);
    expect(isWsUrl("WS://x.test")).toBe(true);
    expect(isWsUrl("WSS://x.test")).toBe(true);
    expect(isWsUrl("  wss://leading-space")).toBe(true);
  });

  it("rejects http(s)://, file://, and empty", () => {
    expect(isWsUrl("https://x.test")).toBe(false);
    expect(isWsUrl("http://x.test")).toBe(false);
    expect(isWsUrl("file:///x")).toBe(false);
    expect(isWsUrl("")).toBe(false);
    expect(isWsUrl("   ")).toBe(false);
  });

  it("rejects unsubstituted env-var prefixes", () => {
    expect(isWsUrl("{{wsBase}}/path")).toBe(false);
  });
});

describe("tryPrettyJson", () => {
  it("returns indented form for valid JSON object", () => {
    const out = tryPrettyJson('{"a":1,"b":2}');
    expect(out).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("returns indented form for valid JSON array", () => {
    const out = tryPrettyJson("[1,2,3]");
    expect(out).toBe("[\n  1,\n  2,\n  3\n]");
  });

  it("returns null for non-JSON text", () => {
    expect(tryPrettyJson("hello world")).toBe(null);
    expect(tryPrettyJson("ping")).toBe(null);
  });

  it("returns null for invalid JSON", () => {
    expect(tryPrettyJson("{ not really }")).toBe(null);
  });

  it("returns null for empty string", () => {
    expect(tryPrettyJson("")).toBe(null);
  });

  it("respects size cap", () => {
    const big = "a".repeat(100);
    expect(tryPrettyJson("{" + big + "}", 50)).toBe(null);
  });
});

describe("looksLikeJson", () => {
  it("checks the first non-whitespace character only (cheap)", () => {
    expect(looksLikeJson("{")).toBe(true);
    expect(looksLikeJson("  [")).toBe(true);
    expect(looksLikeJson("hello")).toBe(false);
    expect(looksLikeJson("123")).toBe(false);
  });
});

describe("nextMessageId", () => {
  it("produces unique ids", () => {
    const a = nextMessageId();
    const b = nextMessageId();
    expect(a).not.toBe(b);
    expect(a.startsWith("wsm-")).toBe(true);
  });
});
