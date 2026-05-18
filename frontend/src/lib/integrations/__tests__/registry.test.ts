/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { INTEGRATIONS, findIntegration } from "../registry";

describe("INTEGRATIONS registry", () => {
  it("has at least one entry", () => {
    expect(INTEGRATIONS.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = INTEGRATIONS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry carries the required fields", () => {
    for (const def of INTEGRATIONS) {
      expect(def.id).toBeTruthy();
      expect(def.name).toBeTruthy();
      expect(def.category).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.authType).toBeTruthy();
    }
  });

  it("every entry sources its surface via a recognized fetch kind", () => {
    for (const def of INTEGRATIONS) {
      if (def.fetch.kind === "openapi-url") {
        expect(def.fetch.specUrl).toMatch(/^https:\/\//);
      } else {
        expect(def.fetch.kind).toBe("curated");
        expect(def.fetch.provider.baseUrl).toMatch(/^https:\/\//);
        expect(def.fetch.provider.endpoints.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("findIntegration", () => {
  it("finds a known id", () => {
    expect(findIntegration("cloudflare")?.name).toBe("Cloudflare");
  });

  it("returns undefined for an unknown id", () => {
    expect(findIntegration("not-a-real-id")).toBeUndefined();
  });
});
