/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { buildMockStartPayload, mockBaseUrl } from "../mock";
import type { Example } from "../types";

const mkExample = (over: Partial<Example> = {}): Example => ({
  id: "ex1",
  name: "users",
  status: 200,
  headers: [{ k: "Content-Type", v: "application/json" }],
  body: '{"ok":true}',
  contentType: "application/json",
  path: "/api/users",
  method: "GET",
  savedAt: 0,
  ...over,
});

describe("buildMockStartPayload", () => {
  it("carries the collectionId and the examples through verbatim", () => {
    const examples = [mkExample(), mkExample({ id: "ex2", path: "/api/orders" })];
    const payload = buildMockStartPayload("col-1", examples);
    expect(payload.collectionId).toBe("col-1");
    expect(payload.examples).toEqual(examples);
    // No fixed port → the `port` key is omitted (Zig defaults to ephemeral).
    expect("port" in payload).toBe(false);
  });

  it("coerces a null collectionId to an empty string", () => {
    expect(buildMockStartPayload(null, []).collectionId).toBe("");
  });

  it("includes a fixed port only when it is greater than zero", () => {
    expect(buildMockStartPayload("c", [], 8080).port).toBe(8080);
    expect("port" in buildMockStartPayload("c", [], 0)).toBe(false);
    expect("port" in buildMockStartPayload("c", [])).toBe(false);
  });
});

describe("mockBaseUrl", () => {
  it("builds a loopback URL for the given port", () => {
    expect(mockBaseUrl(54321)).toBe("http://127.0.0.1:54321");
  });
});
