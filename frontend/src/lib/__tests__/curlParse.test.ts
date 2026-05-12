/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { parseCurl, tokenizeShell, looksLikeCurl } from "../curlParse";

describe("looksLikeCurl", () => {
  it("matches the canonical prefix", () => {
    expect(looksLikeCurl("curl https://x.test")).toBe(true);
    expect(looksLikeCurl("CURL https://x.test")).toBe(true);
    expect(looksLikeCurl("  curl  -X POST x")).toBe(true);
  });
  it("rejects non-curl text", () => {
    expect(looksLikeCurl("https://x.test")).toBe(false);
    expect(looksLikeCurl("wget https://x.test")).toBe(false);
    expect(looksLikeCurl("")).toBe(false);
  });
});

describe("tokenizeShell", () => {
  it("splits unquoted args on whitespace", () => {
    expect(tokenizeShell("a b c")).toEqual(["a", "b", "c"]);
  });
  it("preserves single-quoted strings literally", () => {
    expect(tokenizeShell("a 'b c d' e")).toEqual(["a", "b c d", "e"]);
  });
  it("preserves double-quoted strings + processes escapes", () => {
    expect(tokenizeShell('a "b\\"c" d')).toEqual(["a", 'b"c', "d"]);
  });
  it("handles backslash line continuations", () => {
    const out = tokenizeShell("curl -X POST \\\n  -H 'A: 1' \\\n  url");
    expect(out).toEqual(["curl", "-X", "POST", "-H", "A: 1", "url"]);
  });
  it("merges adjacent quoted+unquoted into one token", () => {
    expect(tokenizeShell("foo'bar'baz")).toEqual(["foobarbaz"]);
  });
});

describe("parseCurl", () => {
  it("parses bare URL → GET", () => {
    const out = parseCurl("curl https://api.test/users");
    expect(out.method).toBe("GET");
    expect(out.url).toBe("https://api.test/users");
    expect(out.headers).toEqual([]);
    expect(out.body).toBe("");
    expect(out.auth).toBe(null);
  });

  it("parses -X POST + -H + -d", () => {
    const out = parseCurl(
      `curl -X POST 'https://api.test/users' -H 'Content-Type: application/json' -d '{"name":"Ada"}'`
    );
    expect(out.method).toBe("POST");
    expect(out.url).toBe("https://api.test/users");
    expect(out.headers).toEqual([{ enabled: true, k: "Content-Type", v: "application/json" }]);
    expect(out.body).toBe('{"name":"Ada"}');
  });

  it("auto-detects POST when -d is present without -X", () => {
    const out = parseCurl("curl https://x.test -d 'foo=bar'");
    expect(out.method).toBe("POST");
    expect(out.body).toBe("foo=bar");
  });

  it("supports --request / --header / --data-raw long forms", () => {
    const out = parseCurl(
      `curl --request PUT --header 'X-Trace: abc' --data-raw '{}' https://x.test`
    );
    expect(out.method).toBe("PUT");
    expect(out.headers).toEqual([{ enabled: true, k: "X-Trace", v: "abc" }]);
    expect(out.body).toBe("{}");
    expect(out.url).toBe("https://x.test");
  });

  it("handles --header=Value (= form)", () => {
    const out = parseCurl(`curl --header='Accept: */*' https://x.test`);
    expect(out.headers).toEqual([{ enabled: true, k: "Accept", v: "*/*" }]);
  });

  it("collects multiple headers", () => {
    const out = parseCurl(`curl -H 'A: 1' -H 'B: 2' -H 'C: 3' https://x.test`);
    expect(out.headers).toEqual([
      { enabled: true, k: "A", v: "1" },
      { enabled: true, k: "B", v: "2" },
      { enabled: true, k: "C", v: "3" },
    ]);
  });

  it("converts -u user:pass into Basic auth", () => {
    const out = parseCurl(`curl -u alice:s3cret https://x.test`);
    expect(out.auth).toEqual({ type: "basic", user: "alice", pass: "s3cret" });
  });

  it("converts --user with no password into user-only Basic", () => {
    const out = parseCurl(`curl --user alice https://x.test`);
    expect(out.auth).toEqual({ type: "basic", user: "alice", pass: "" });
  });

  it("maps -A / --user-agent / -e / --referer / -b / --cookie to headers", () => {
    const out = parseCurl(`curl -A 'Mozilla/5.0' -e 'https://ref' -b 'sid=abc' https://x.test`);
    const names = out.headers.map((h) => h.k);
    expect(names).toContain("User-Agent");
    expect(names).toContain("Referer");
    expect(names).toContain("Cookie");
  });

  it("ignores noise flags (-v, -s, -k, etc.)", () => {
    const out = parseCurl("curl -v -s -k -L https://x.test");
    expect(out.url).toBe("https://x.test");
    expect(out.unknownFlags).toEqual([]);
  });

  it("survives multi-line continuation", () => {
    const out = parseCurl(`curl -X POST \\
  -H 'Content-Type: application/json' \\
  -d '{"k":1}' \\
  https://x.test`);
    expect(out.method).toBe("POST");
    expect(out.url).toBe("https://x.test");
    expect(out.body).toBe('{"k":1}');
  });

  it("merges multiple --data into & joined string (mimics curl)", () => {
    const out = parseCurl(`curl https://x.test -d 'a=1' -d 'b=2'`);
    expect(out.body).toBe("a=1&b=2");
  });

  it("records unknown flags but doesn't fail", () => {
    const out = parseCurl(`curl --weird-flag https://x.test`);
    expect(out.url).toBe("https://x.test");
    expect(out.unknownFlags).toEqual(["--weird-flag"]);
  });

  it("supports --url=URL form", () => {
    const out = parseCurl(`curl --url=https://x.test -X DELETE`);
    expect(out.url).toBe("https://x.test");
    expect(out.method).toBe("DELETE");
  });

  it("strips a leading 'curl' even when uppercase", () => {
    const out = parseCurl("CURL https://x.test");
    expect(out.url).toBe("https://x.test");
  });
});
