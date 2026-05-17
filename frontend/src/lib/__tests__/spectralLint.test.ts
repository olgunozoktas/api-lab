/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { lintSpec, parseCustomRuleset } from "../spectralLint";

// A deliberately thin OpenAPI 3 spec — no `servers`, no operation
// `description` / `operationId` / `tags`, sparse `info`. The `oas`
// ruleset (run with "all") flags plenty here.
const THIN_SPEC = `openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /things:
    get:
      responses:
        '200':
          description: ok
`;

describe("parseCustomRuleset", () => {
  it("returns the rules override map", () => {
    expect(parseCustomRuleset("rules:\n  oas3-api-servers: off")).toEqual({
      "oas3-api-servers": "off",
    });
  });

  it("returns an empty map for blank input", () => {
    expect(parseCustomRuleset("")).toEqual({});
    expect(parseCustomRuleset("   ")).toEqual({});
  });

  it("returns an empty map when there is no `rules` key", () => {
    expect(parseCustomRuleset("extends: spectral:oas")).toEqual({});
  });

  it("throws on invalid YAML", () => {
    expect(() => parseCustomRuleset("rules: [unclosed")).toThrow(/Invalid ruleset YAML/);
  });

  it("throws when `rules` is not an object", () => {
    expect(() => parseCustomRuleset("rules: 42")).toThrow(/`rules` must be a YAML object/);
  });
});

describe("lintSpec", () => {
  it("surfaces findings for a thin spec", async () => {
    const findings = await lintSpec(THIN_SPEC, false);
    expect(findings.length).toBeGreaterThan(0);
    // Every finding carries CodeMirror-friendly coordinates.
    expect(findings[0]).toHaveProperty("startLine");
    expect(findings[0]).toHaveProperty("severity");
  }, 20000);

  it("flags the missing `servers` block", async () => {
    const findings = await lintSpec(THIN_SPEC, false);
    expect(findings.some((f) => f.code === "oas3-api-servers")).toBe(true);
  }, 20000);

  it("a custom ruleset can disable a rule", async () => {
    const custom = "rules:\n  oas3-api-servers: off\n";
    const findings = await lintSpec(THIN_SPEC, false, custom);
    expect(findings.some((f) => f.code === "oas3-api-servers")).toBe(false);
  }, 20000);

  it("returns an empty list for blank input", async () => {
    expect(await lintSpec("", false)).toEqual([]);
  });
});
