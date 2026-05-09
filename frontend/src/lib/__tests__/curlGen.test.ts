import { describe, it, expect } from "vitest";
import { toCurl } from "../curlGen";

describe("toCurl", () => {
  it("emits a GET with no headers and no body", () => {
    const out = toCurl({
      method: "GET",
      url: "https://example.com",
      headers: [],
    });
    expect(out).toBe("curl -X GET 'https://example.com'");
  });

  it("includes each non-empty header as a -H line", () => {
    const out = toCurl({
      method: "POST",
      url: "https://api.test/echo",
      headers: [
        { name: "Content-Type", value: "application/json" },
        { name: "X-Trace", value: "abc" },
      ],
    });
    expect(out).toContain("-H 'Content-Type: application/json'");
    expect(out).toContain("-H 'X-Trace: abc'");
    expect(out).toContain("curl -X POST 'https://api.test/echo'");
  });

  it("skips headers with empty name", () => {
    const out = toCurl({
      method: "GET",
      url: "https://x.test",
      headers: [{ name: "", value: "ignored" }],
    });
    expect(out).toBe("curl -X GET 'https://x.test'");
  });

  it("includes --data-raw for POST/PUT/PATCH bodies", () => {
    const out = toCurl({
      method: "POST",
      url: "https://x.test",
      headers: [],
      body: '{"k":1}',
    });
    expect(out).toContain("--data-raw '{\"k\":1}'");
  });

  it("omits --data-raw for GET / HEAD", () => {
    const get = toCurl({
      method: "GET",
      url: "https://x.test",
      headers: [],
      body: "ignored",
    });
    const head = toCurl({
      method: "HEAD",
      url: "https://x.test",
      headers: [],
      body: "ignored",
    });
    expect(get).not.toContain("--data-raw");
    expect(head).not.toContain("--data-raw");
  });

  it("escapes single quotes in URL, header value, and body", () => {
    const out = toCurl({
      method: "POST",
      url: "https://x.test/?q='quoted'",
      headers: [{ name: "X-Note", value: "it's fine" }],
      body: "wasn't there",
    });
    // Single-quote escape pattern: '\''  (close quote, escaped quote, reopen)
    expect(out).toContain("'\\''");
    // URL value still wrapped in outer single quotes after escape
    expect(out).toContain("https://x.test/?q='\\''quoted'\\''");
  });

  it("joins lines with backslash + newline", () => {
    const out = toCurl({
      method: "POST",
      url: "https://x.test",
      headers: [{ name: "A", value: "1" }],
      body: "x",
    });
    expect(out.split("\n").length).toBeGreaterThan(1);
    expect(out).toMatch(/\\\n/);
  });
});
