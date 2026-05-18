/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { parseIntegrationSpec, SPEC_SIZE_LIMIT } from "../fetch";
import { INTEGRATIONS } from "../registry";

const DEF = INTEGRATIONS[0];

const MINIMAL_SPEC = JSON.stringify({
  openapi: "3.0.0",
  info: { title: "Test API", version: "1.0.0" },
  paths: {
    "/ping": {
      get: { operationId: "ping", responses: { "200": { description: "ok" } } },
    },
  },
});

describe("parseIntegrationSpec", () => {
  it("parses a valid OpenAPI 3 spec into items", () => {
    const res = parseIntegrationSpec(MINIMAL_SPEC, DEF);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.items.length).toBeGreaterThan(0);
  });

  it("flags an oversize body without attempting to parse", () => {
    const res = parseIntegrationSpec("x".repeat(SPEC_SIZE_LIMIT), DEF);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("too-large");
  });

  it("flags an unparseable body", () => {
    const res = parseIntegrationSpec("definitely not a spec", DEF);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("parse-failed");
  });
});
