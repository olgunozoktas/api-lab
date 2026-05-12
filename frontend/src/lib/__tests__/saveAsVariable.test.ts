/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { suggestVariableName } from "../../components/SaveAsVariable";

describe("suggestVariableName", () => {
  it("recognizes JWT-shaped tokens", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
      ".eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4iLCJpYXQiOjE1MTYyMzkwMjJ9" +
      ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    expect(suggestVariableName(jwt)).toBe("token");
  });

  it("recognizes uuid-shaped values as id", () => {
    expect(suggestVariableName("550e8400-e29b-41d4-a716-446655440000")).toBe("id");
    expect(suggestVariableName("550E8400-E29B-41D4-A716-446655440000")).toBe("id");
  });

  it("recognizes pure numbers as id", () => {
    expect(suggestVariableName("42")).toBe("id");
    expect(suggestVariableName("-7")).toBe("id");
    expect(suggestVariableName("3.14")).toBe("id");
  });

  it("returns empty for ambiguous strings", () => {
    expect(suggestVariableName("Hello world")).toBe("");
    expect(suggestVariableName("user@example.com")).toBe("");
    expect(suggestVariableName("https://api.example.com")).toBe("");
  });

  it("returns empty for empty / whitespace-only input", () => {
    expect(suggestVariableName("")).toBe("");
    expect(suggestVariableName("   ")).toBe("");
  });

  it("does not classify non-JWT tokens starting with eyJ as token", () => {
    // Has the eyJ prefix but only one dot — not a JWT
    expect(suggestVariableName("eyJabc.def")).toBe("");
  });

  it("does not classify partial uuids as id", () => {
    expect(suggestVariableName("550e8400-e29b-41d4")).toBe("");
  });
});
