import { describe, it, expect } from "vitest";
import { toCurl, toFetch, toAxios, toPython, toGo, toNode, generate, formatters } from "../codegen";

const SAMPLE_GET = {
  method: "GET",
  url: "https://api.test/users",
  headers: [{ name: "Accept", value: "application/json" }],
};

const SAMPLE_POST = {
  method: "POST",
  url: "https://api.test/users",
  headers: [
    { name: "Content-Type", value: "application/json" },
    { name: "X-Trace", value: "abc" },
  ],
  body: '{"name":"Ada"}',
};

describe("codegen registry", () => {
  it("exposes 6 formatters in canonical order", () => {
    expect(formatters.map((f) => f.id)).toEqual(["curl", "fetch", "axios", "python", "go", "node"]);
  });

  it("generate() dispatches to the registered formatter", () => {
    const out = generate("curl", SAMPLE_GET);
    expect(out).toBe(toCurl(SAMPLE_GET));
  });

  it("generate() throws on unknown language", () => {
    expect(() => generate("ruby" as never, SAMPLE_GET)).toThrow();
  });
});

describe("toFetch", () => {
  it("emits a GET with no body", () => {
    const out = toFetch(SAMPLE_GET);
    expect(out).toContain('fetch("https://api.test/users", {');
    expect(out).toContain('method: "GET",');
    expect(out).not.toContain("body:");
  });

  it("emits headers + body for POST", () => {
    const out = toFetch(SAMPLE_POST);
    expect(out).toContain('"Content-Type": "application/json"');
    expect(out).toContain('"X-Trace": "abc"');
    expect(out).toContain('body: "{\\"name\\":\\"Ada\\"}"');
  });

  it("escapes special characters in URL + body", () => {
    const out = toFetch({
      method: "POST",
      url: 'https://x.test/?q="quoted"',
      headers: [],
      body: 'a\nb"c',
    });
    expect(out).toContain('\\"quoted\\"');
    expect(out).toContain('"a\\nb\\"c"');
  });

  it("omits body for HEAD", () => {
    const out = toFetch({ ...SAMPLE_POST, method: "HEAD" });
    expect(out).not.toContain("body:");
  });
});

describe("toAxios", () => {
  it("starts with axios import + uses lowercase method", () => {
    const out = toAxios(SAMPLE_POST);
    expect(out.split("\n")[0]).toBe('import axios from "axios";');
    expect(out).toContain('method: "post",');
    expect(out).toContain('url: "https://api.test/users",');
  });

  it("emits data for body methods", () => {
    const out = toAxios(SAMPLE_POST);
    expect(out).toContain('data: "{\\"name\\":\\"Ada\\"}"');
  });

  it("omits data block for GET", () => {
    const out = toAxios(SAMPLE_GET);
    expect(out).not.toContain("data:");
  });
});

describe("toPython", () => {
  it("starts with import requests", () => {
    const out = toPython(SAMPLE_GET);
    expect(out.startsWith("import requests")).toBe(true);
  });

  it("emits headers dict and call requests.request with method positional", () => {
    const out = toPython(SAMPLE_POST);
    expect(out).toContain("headers = {");
    expect(out).toContain('"Content-Type": "application/json",');
    expect(out).toMatch(/requests\.request\("POST", url="https:\/\/api\.test\/users"/);
  });

  it("includes data assignment when body is present", () => {
    const out = toPython(SAMPLE_POST);
    expect(out).toContain('data = "{\\"name\\":\\"Ada\\"}"');
    expect(out).toContain("data=data");
  });

  it("skips headers + data when neither present", () => {
    const out = toPython({ method: "GET", url: "https://x.test", headers: [] });
    expect(out).not.toContain("headers = {");
    expect(out).not.toContain("data =");
  });
});

describe("toGo", () => {
  it("emits package main + standard imports", () => {
    const out = toGo(SAMPLE_POST);
    expect(out).toContain("package main");
    expect(out).toContain('"net/http"');
    expect(out).toContain('"bytes"'); // body case → bytes import
  });

  it("skips bytes import for GET (no body)", () => {
    const out = toGo(SAMPLE_GET);
    expect(out).not.toContain('"bytes"');
    expect(out).toContain('http.NewRequest("GET", "https://api.test/users", nil)');
  });

  it("emits header Set lines", () => {
    const out = toGo(SAMPLE_POST);
    expect(out).toContain('req.Header.Set("Content-Type", "application/json")');
    expect(out).toContain('req.Header.Set("X-Trace", "abc")');
  });

  it("wraps body in bytes.NewReader for body methods", () => {
    const out = toGo(SAMPLE_POST);
    expect(out).toContain('body := bytes.NewReader([]byte("{\\"name\\":\\"Ada\\"}"))');
  });
});

describe("toNode", () => {
  it("requires https for https:// URLs", () => {
    const out = toNode(SAMPLE_GET);
    expect(out.startsWith('const https = require("https");')).toBe(true);
  });

  it("requires http for http:// URLs", () => {
    const out = toNode({ ...SAMPLE_GET, url: "http://api.test/users" });
    expect(out.startsWith('const http = require("http");')).toBe(true);
  });

  it("splits URL into hostname + path", () => {
    const out = toNode({
      method: "GET",
      url: "https://api.test:8443/users?id=1",
      headers: [],
    });
    expect(out).toContain('hostname: "api.test"');
    expect(out).toContain('port: "8443"');
    expect(out).toContain('path: "/users?id=1"');
  });

  it("omits port when default", () => {
    const out = toNode(SAMPLE_GET);
    expect(out).not.toContain("port:");
  });

  it("emits req.write for body methods", () => {
    const out = toNode(SAMPLE_POST);
    expect(out).toContain('req.write("{\\"name\\":\\"Ada\\"}");');
  });

  it("falls back gracefully on unparseable URLs (env-var leftovers)", () => {
    const out = toNode({
      method: "GET",
      url: "{{baseUrl}}/users",
      headers: [],
    });
    expect(out).toContain("hostname:");
    expect(out).toContain("path:");
  });
});

describe("toCurl regression (re-exported via curlGen.ts shim)", () => {
  it("preserves the legacy import path", async () => {
    const mod = await import("../curlGen");
    expect(typeof mod.toCurl).toBe("function");
    expect(mod.toCurl(SAMPLE_GET)).toBe(toCurl(SAMPLE_GET));
  });
});
