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
      expect(def.fetch.kind).toBe("openapi-url");
      expect(def.fetch.specUrl).toMatch(/^https:\/\//);
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
