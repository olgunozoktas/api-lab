/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  buildCookieHeader,
  cookiesForUrl,
  domainMatches,
  parseSetCookie,
  parseSetCookieHeaders,
  pathMatches,
  type Cookie,
} from "../cookies";

const c = (over: Partial<Cookie> = {}): Cookie => ({
  id: "1",
  domain: "example.com",
  path: "/",
  name: "k",
  value: "v",
  ...over,
});

describe("domainMatches", () => {
  it("exact match", () => {
    expect(domainMatches("example.com", "example.com")).toBe(true);
  });
  it("subdomain matches parent", () => {
    expect(domainMatches("api.example.com", "example.com")).toBe(true);
    expect(domainMatches("a.b.example.com", "example.com")).toBe(true);
  });
  it("does NOT match across a non-boundary (`notexample.com`)", () => {
    expect(domainMatches("notexample.com", "example.com")).toBe(false);
  });
  it("leading dot in cookie domain is ignored (RFC 6265)", () => {
    expect(domainMatches("api.example.com", ".example.com")).toBe(true);
    expect(domainMatches("example.com", ".example.com")).toBe(true);
  });
  it("case-insensitive", () => {
    expect(domainMatches("API.Example.COM", "example.com")).toBe(true);
  });
  it("empty inputs reject", () => {
    expect(domainMatches("", "example.com")).toBe(false);
    expect(domainMatches("example.com", "")).toBe(false);
  });
});

describe("pathMatches", () => {
  it("exact match", () => {
    expect(pathMatches("/api", "/api")).toBe(true);
    expect(pathMatches("/", "/")).toBe(true);
  });
  it("cookie path is a prefix at a boundary", () => {
    expect(pathMatches("/api/v1", "/api")).toBe(true);
    expect(pathMatches("/api/", "/api")).toBe(true);
  });
  it("non-boundary prefix rejects", () => {
    expect(pathMatches("/apiv1", "/api")).toBe(false);
    expect(pathMatches("/apifoo", "/api")).toBe(false);
  });
  it("trailing-slash cookie path accepts any tail", () => {
    expect(pathMatches("/api/v1", "/api/")).toBe(true);
    expect(pathMatches("/api/", "/api/")).toBe(true);
  });
  it("empty cookie path defaults to /", () => {
    expect(pathMatches("/whatever", "")).toBe(true);
  });
});

describe("cookiesForUrl", () => {
  const jar: Cookie[] = [
    c({ id: "a", domain: "example.com", path: "/", name: "session", value: "abc" }),
    c({ id: "b", domain: "api.example.com", path: "/v1", name: "scoped", value: "xyz" }),
    c({ id: "c", domain: "other.com", path: "/", name: "other", value: "no" }),
  ];

  it("returns cookies matching domain + path", () => {
    const out = cookiesForUrl(jar, "https://example.com/anywhere");
    expect(out.map((x) => x.id)).toEqual(["a"]);
  });

  it("subdomain inherits parent-domain cookies", () => {
    const out = cookiesForUrl(jar, "https://api.example.com/v1/users");
    expect(out.map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("path-scoped cookies don't fire outside their prefix", () => {
    const out = cookiesForUrl(jar, "https://api.example.com/v2/users");
    expect(out.map((x) => x.id)).toEqual(["a"]);
  });

  it("unrelated domain receives nothing", () => {
    const out = cookiesForUrl(jar, "https://elsewhere.test/path");
    expect(out).toEqual([]);
  });

  it("invalid URL → empty (no throw)", () => {
    expect(cookiesForUrl(jar, "not a url")).toEqual([]);
    expect(cookiesForUrl(jar, "")).toEqual([]);
  });
});

describe("buildCookieHeader", () => {
  it("formats name=value pairs joined by '; '", () => {
    const out = buildCookieHeader([c({ name: "a", value: "1" }), c({ name: "b", value: "2" })]);
    expect(out).toBe("a=1; b=2");
  });
  it("empty list → empty string", () => {
    expect(buildCookieHeader([])).toBe("");
  });
});

describe("parseSetCookie", () => {
  it("parses name=value with explicit Domain and Path", () => {
    const out = parseSetCookie("session=abc; Domain=example.com; Path=/api", "api.example.com");
    expect(out).toEqual({ domain: "example.com", path: "/api", name: "session", value: "abc" });
  });
  it("falls back to request host when Domain= absent", () => {
    const out = parseSetCookie("token=xyz; Path=/", "api.example.com");
    expect(out?.domain).toBe("api.example.com");
  });
  it("strips a leading dot from Domain for canonical storage", () => {
    const out = parseSetCookie("k=v; Domain=.example.com", "x.example.com");
    expect(out?.domain).toBe("example.com");
  });
  it("ignores attribute flags (Secure, HttpOnly) in v1", () => {
    const out = parseSetCookie("k=v; Secure; HttpOnly", "example.com");
    expect(out).toEqual({ domain: "example.com", path: "/", name: "k", value: "v" });
  });
  it("returns null on shapes we can't parse", () => {
    expect(parseSetCookie("", "x.com")).toBe(null);
    expect(parseSetCookie("noequals", "x.com")).toBe(null);
    expect(parseSetCookie("=valueonly", "x.com")).toBe(null);
  });
});

describe("parseSetCookieHeaders", () => {
  it("only consumes Set-Cookie headers (case-insensitive)", () => {
    const out = parseSetCookieHeaders(
      [
        { name: "Content-Type", value: "text/plain" },
        { name: "Set-Cookie", value: "a=1; Path=/" },
        { name: "set-cookie", value: "b=2; Domain=example.com" },
      ],
      "example.com"
    );
    expect(out.map((x) => x.name).sort()).toEqual(["a", "b"]);
  });
  it("silently skips unparseable entries", () => {
    const out = parseSetCookieHeaders(
      [
        { name: "Set-Cookie", value: "noequals" },
        { name: "Set-Cookie", value: "good=value" },
      ],
      "example.com"
    );
    expect(out.map((x) => x.name)).toEqual(["good"]);
  });
});
