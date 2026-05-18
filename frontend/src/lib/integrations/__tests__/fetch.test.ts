/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  buildCuratedResult,
  fetchIntegrationSpec,
  parseIntegrationSpec,
  SPEC_SIZE_LIMIT,
} from "../fetch";
import { findIntegration, INTEGRATIONS } from "../registry";

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

describe("buildCuratedResult", () => {
  it("builds importable items for a curated provider", () => {
    const cloudflare = findIntegration("cloudflare")!;
    const res = buildCuratedResult(cloudflare);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.items.length).toBeGreaterThan(0);
      expect(res.result.requestCount).toBeGreaterThan(0);
      expect(res.result.envVars).toEqual({});
    }
  });
});

describe("fetchIntegrationSpec — curated path", () => {
  it("sources a curated provider without touching the bridge", async () => {
    // No bridge is available in the test env; a curated provider must
    // still resolve because it builds from bundled data.
    const stripe = findIntegration("stripe")!;
    const res = await fetchIntegrationSpec(stripe);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.requestCount).toBeGreaterThan(0);
  });

  it("never reports a curated provider as too-large", async () => {
    for (const def of INTEGRATIONS) {
      const res = await fetchIntegrationSpec(def);
      expect(res.ok).toBe(true);
    }
  });
});
