import { describe, it, expect } from "vitest";
import { isSseUrl, toEventSourceUrl, tryPrettyJson, looksLikeJson, nextMessageId } from "../sse";

describe("isSseUrl", () => {
  it("accepts sse:// and sses:// (case-insensitive)", () => {
    expect(isSseUrl("sse://api.example.com/stream")).toBe(true);
    expect(isSseUrl("sses://api.example.com/stream")).toBe(true);
    expect(isSseUrl("SSE://api")).toBe(true);
    expect(isSseUrl("SSES://api")).toBe(true);
    expect(isSseUrl("  sse://leading-space")).toBe(true);
  });

  it("rejects http(s)://, ws(s)://, grpc(s)://, file://, and empty", () => {
    expect(isSseUrl("https://api.example.com/stream")).toBe(false);
    expect(isSseUrl("http://api.example.com/stream")).toBe(false);
    expect(isSseUrl("ws://api.example.com")).toBe(false);
    expect(isSseUrl("grpc://api.example.com")).toBe(false);
    expect(isSseUrl("file:///x")).toBe(false);
    expect(isSseUrl("")).toBe(false);
    expect(isSseUrl("   ")).toBe(false);
  });

  it("rejects bare host (no scheme)", () => {
    expect(isSseUrl("api.example.com/stream")).toBe(false);
  });
});

describe("toEventSourceUrl", () => {
  it("rewrites sse:// → http://", () => {
    expect(toEventSourceUrl("sse://api.example.com/stream")).toBe("http://api.example.com/stream");
  });

  it("rewrites sses:// → https://", () => {
    expect(toEventSourceUrl("sses://api.example.com/stream")).toBe(
      "https://api.example.com/stream"
    );
  });

  it("preserves the path + query verbatim after the scheme swap", () => {
    expect(toEventSourceUrl("sses://api.example.com/v2/stream?token=x&y=1")).toBe(
      "https://api.example.com/v2/stream?token=x&y=1"
    );
  });

  it("returns input unchanged when no recognized prefix is present", () => {
    expect(toEventSourceUrl("https://api.example.com/stream")).toBe(
      "https://api.example.com/stream"
    );
    expect(toEventSourceUrl("http://localhost:8080/sse")).toBe("http://localhost:8080/sse");
  });

  it("trims surrounding whitespace before the rewrite", () => {
    expect(toEventSourceUrl("  sse://x:1/s  ")).toBe("http://x:1/s");
  });

  it("preserves case after the scheme", () => {
    expect(toEventSourceUrl("SSE://Host.Example/Stream")).toBe("http://Host.Example/Stream");
  });
});

describe("tryPrettyJson", () => {
  it("pretty-prints object input", () => {
    expect(tryPrettyJson('{"a":1,"b":2}')).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("pretty-prints array input", () => {
    expect(tryPrettyJson("[1,2,3]")).toBe("[\n  1,\n  2,\n  3\n]");
  });

  it("returns null for non-JSON-shaped input", () => {
    expect(tryPrettyJson("hello world")).toBeNull();
    expect(tryPrettyJson("123")).toBeNull(); // doesn't start with { or [
    expect(tryPrettyJson("")).toBeNull();
  });

  it("returns null for malformed JSON that starts like JSON", () => {
    expect(tryPrettyJson('{"a":}')).toBeNull();
  });

  it("respects the size cap (returns null when exceeded)", () => {
    const big = "[" + "0,".repeat(50000) + "0]"; // ~100 KB
    expect(tryPrettyJson(big, 64 * 1024)).toBeNull();
  });
});

describe("looksLikeJson", () => {
  it("accepts JSON-shaped strings (object + array)", () => {
    expect(looksLikeJson('{"a":1}')).toBe(true);
    expect(looksLikeJson("[1,2,3]")).toBe(true);
    expect(looksLikeJson("  \n {")).toBe(true);
  });

  it("rejects non-JSON-shaped strings", () => {
    expect(looksLikeJson("hello")).toBe(false);
    expect(looksLikeJson("123")).toBe(false);
    expect(looksLikeJson("")).toBe(false);
  });
});

describe("nextMessageId", () => {
  it("yields ssem-prefixed ids that are unique within a process", () => {
    const a = nextMessageId();
    const b = nextMessageId();
    expect(a).toMatch(/^ssem-/);
    expect(b).toMatch(/^ssem-/);
    expect(a).not.toBe(b);
  });
});
