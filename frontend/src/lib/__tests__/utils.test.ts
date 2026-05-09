import { describe, it, expect } from "vitest";
import {
  envSubst,
  statusText,
  humanSize,
  isProbablyJson,
  methodClass,
} from "../utils";

describe("envSubst", () => {
  it("substitutes a single placeholder", () => {
    expect(envSubst("Hello {{name}}", { name: "Alice" })).toBe("Hello Alice");
  });

  it("substitutes multiple placeholders in one string", () => {
    expect(envSubst("{{greet}}, {{name}}!", { greet: "Hi", name: "Bob" })).toBe(
      "Hi, Bob!"
    );
  });

  it("leaves unknown placeholders untouched", () => {
    expect(envSubst("Hello {{missing}}", {})).toBe("Hello {{missing}}");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(envSubst("Hello {{  name  }}", { name: "x" })).toBe("Hello x");
  });

  it("supports keys with dots and dashes", () => {
    expect(envSubst("{{api.base-url}}", { "api.base-url": "https://x" })).toBe(
      "https://x"
    );
  });

  it("returns empty string for null / undefined input", () => {
    expect(envSubst(null, {})).toBe("");
    expect(envSubst(undefined, {})).toBe("");
  });

  it("does not replace inside nested values (no recursion)", () => {
    expect(envSubst("{{a}}", { a: "{{b}}", b: "x" })).toBe("{{b}}");
  });
});

describe("statusText", () => {
  it("returns text for known 2xx codes", () => {
    expect(statusText(200)).toBe("OK");
    expect(statusText(201)).toBe("Created");
    expect(statusText(204)).toBe("No Content");
  });

  it("returns text for known 4xx / 5xx codes", () => {
    expect(statusText(404)).toBe("Not Found");
    expect(statusText(500)).toBe("Server Error");
  });

  it("returns empty string for unknown codes", () => {
    expect(statusText(0)).toBe("");
    expect(statusText(999)).toBe("");
  });
});

describe("humanSize", () => {
  it("formats bytes under 1 KB plainly", () => {
    expect(humanSize(0)).toBe("0 B");
    expect(humanSize(512)).toBe("512 B");
    expect(humanSize(1023)).toBe("1023 B");
  });

  it("formats KB with one decimal", () => {
    expect(humanSize(1024)).toBe("1.0 KB");
    expect(humanSize(1536)).toBe("1.5 KB");
  });

  it("formats MB with two decimals", () => {
    expect(humanSize(1024 * 1024)).toBe("1.00 MB");
    expect(humanSize(2.5 * 1024 * 1024)).toBe("2.50 MB");
  });
});

describe("isProbablyJson", () => {
  it("recognizes object start", () => {
    expect(isProbablyJson('{"a":1}')).toBe(true);
    expect(isProbablyJson("   { }")).toBe(true);
  });

  it("recognizes array start", () => {
    expect(isProbablyJson("[1,2,3]")).toBe(true);
    expect(isProbablyJson("\n  [\n]")).toBe(true);
  });

  it("rejects non-JSON-shaped strings", () => {
    expect(isProbablyJson("hello")).toBe(false);
    expect(isProbablyJson("<html>")).toBe(false);
    expect(isProbablyJson("")).toBe(false);
  });
});

describe("methodClass", () => {
  it("maps each known method to its color class", () => {
    expect(methodClass("GET")).toBe("text-green-500");
    expect(methodClass("POST")).toBe("text-orange-500");
    expect(methodClass("PUT")).toBe("text-sky-500");
    expect(methodClass("PATCH")).toBe("text-purple-500");
    expect(methodClass("DELETE")).toBe("text-red-500");
  });

  it("falls back to a muted token for unknown methods", () => {
    expect(methodClass("HEAD")).toBe("text-[var(--color-fg-muted)]");
    expect(methodClass("")).toBe("text-[var(--color-fg-muted)]");
  });
});
