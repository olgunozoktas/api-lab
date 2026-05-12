/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  pathFromUrl,
  exampleFromResponse,
  exampleToResponse,
  suggestExampleName,
} from "../examples";
import type { RequestSnapshot, ResponseSnapshot } from "../types";

const mkRequest = (over: Partial<RequestSnapshot> = {}): RequestSnapshot => ({
  method: "GET",
  url: "https://api.example.test/users/42",
  params: [],
  headers: [],
  auth: { type: "none" },
  body: { mode: "none", text: "" },
  gql: { query: "", vars: "" },
  ...over,
});

const mkResponse = (over: Partial<ResponseSnapshot> = {}): ResponseSnapshot => ({
  status: 200,
  statusText: "OK",
  headers: [{ k: "Content-Type", v: "application/json" }],
  body: '{"id":42}',
  contentType: "application/json",
  sizeBytes: 9,
  elapsedMs: 12,
  url: "https://api.example.test/users/42",
  transport: "native",
  ...over,
});

describe("pathFromUrl", () => {
  it("extracts pathname from a full URL", () => {
    expect(pathFromUrl("https://api.example.com/v1/users")).toBe("/v1/users");
  });

  it("strips query string", () => {
    expect(pathFromUrl("https://api.example.com/list?limit=10")).toBe("/list");
  });

  it("returns / for the root", () => {
    expect(pathFromUrl("https://api.example.com")).toBe("/");
  });

  it("handles {{base_url}} prefix and keeps the path", () => {
    expect(pathFromUrl("{{base_url}}/users/42")).toBe("/users/42");
  });

  it("handles {{base_url}} with no trailing path", () => {
    expect(pathFromUrl("{{base_url}}")).toBe("/");
  });

  it("normalizes bare paths missing a leading slash", () => {
    expect(pathFromUrl("api/v2/health")).toBe("/api/v2/health");
  });

  it("returns / for empty input", () => {
    expect(pathFromUrl("")).toBe("/");
  });

  it("strips query from bare paths too", () => {
    expect(pathFromUrl("/users?id=42")).toBe("/users");
  });
});

describe("exampleFromResponse", () => {
  it("captures status, headers, body, content-type", () => {
    const ex = exampleFromResponse("List users", mkRequest(), mkResponse());
    expect(ex.status).toBe(200);
    expect(ex.body).toBe('{"id":42}');
    expect(ex.contentType).toBe("application/json");
    expect(ex.headers).toHaveLength(1);
  });

  it("falls back to <status URL> when name is empty", () => {
    const ex = exampleFromResponse("   ", mkRequest(), mkResponse());
    expect(ex.name).toContain("200");
  });

  it("captures path + method (uppercased)", () => {
    const ex = exampleFromResponse("X", mkRequest({ method: "post" }), mkResponse());
    expect(ex.method).toBe("POST");
    expect(ex.path).toBe("/users/42");
  });

  it("ID is non-empty + has ex_ prefix", () => {
    const ex = exampleFromResponse("X", mkRequest(), mkResponse());
    expect(ex.id).toMatch(/^ex_/);
  });
});

describe("exampleToResponse", () => {
  it("round-trips status + headers + body", () => {
    const ex = exampleFromResponse("X", mkRequest(), mkResponse());
    const r = exampleToResponse(ex, "http://localhost:3000/users/42");
    expect(r.status).toBe(200);
    expect(r.body).toBe('{"id":42}');
    expect(r.contentType).toBe("application/json");
    expect(r.url).toBe("http://localhost:3000/users/42");
  });

  it("sets transport=fetch and elapsedMs=0", () => {
    const ex = exampleFromResponse("X", mkRequest(), mkResponse());
    const r = exampleToResponse(ex, "http://x.test");
    expect(r.transport).toBe("fetch");
    expect(r.elapsedMs).toBe(0);
  });
});

describe("suggestExampleName", () => {
  it("formats METHOD path → status", () => {
    expect(suggestExampleName(mkRequest(), mkResponse())).toBe("GET /users/42 → 200");
  });

  it("uppercases the method", () => {
    expect(suggestExampleName(mkRequest({ method: "delete" }), mkResponse({ status: 204 }))).toBe(
      "DELETE /users/42 → 204"
    );
  });

  it("works with mustache URL prefix", () => {
    expect(
      suggestExampleName(mkRequest({ url: "{{base_url}}/v1/health" }), mkResponse({ status: 200 }))
    ).toBe("GET /v1/health → 200");
  });
});
