/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { parseIterationData } from "../iterationData";

describe("parseIterationData — CSV", () => {
  it("parses a simple CSV into header-keyed rows", () => {
    const rows = parseIterationData("name,age\nAyşe,30\nMehmet,25");
    expect(rows).toEqual([
      { name: "Ayşe", age: "30" },
      { name: "Mehmet", age: "25" },
    ]);
  });

  it("handles quoted fields with embedded commas", () => {
    const rows = parseIterationData('city,note\n"Istanbul, TR","big, busy"');
    expect(rows[0]).toEqual({ city: "Istanbul, TR", note: "big, busy" });
  });

  it("handles escaped double-quotes inside a quoted field", () => {
    const rows = parseIterationData('q\n"she said ""hi"""');
    expect(rows[0].q).toBe('she said "hi"');
  });

  it("handles embedded newlines inside a quoted field", () => {
    const rows = parseIterationData('body\n"line one\nline two"');
    expect(rows[0].body).toBe("line one\nline two");
  });

  it("accepts CRLF line endings", () => {
    const rows = parseIterationData("a,b\r\n1,2\r\n3,4");
    expect(rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("fills missing trailing cells with empty strings", () => {
    const rows = parseIterationData("a,b,c\n1,2");
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "" });
  });

  it("returns an empty list for blank input", () => {
    expect(parseIterationData("")).toEqual([]);
    expect(parseIterationData("   \n  ")).toEqual([]);
  });
});

describe("parseIterationData — JSON", () => {
  it("parses a JSON array of objects", () => {
    const rows = parseIterationData('[{"id":1,"name":"a"},{"id":2,"name":"b"}]');
    expect(rows).toEqual([
      { id: "1", name: "a" },
      { id: "2", name: "b" },
    ]);
  });

  it("treats a single JSON object as a one-row array", () => {
    expect(parseIterationData('{"k":"v"}')).toEqual([{ k: "v" }]);
  });

  it("coerces nested values to JSON strings and null to empty", () => {
    const rows = parseIterationData('[{"obj":{"x":1},"nil":null}]');
    expect(rows[0]).toEqual({ obj: '{"x":1}', nil: "" });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseIterationData("[{not json")).toThrow(/Invalid JSON/);
  });

  it("throws when a JSON row is not an object", () => {
    expect(() => parseIterationData('[{"a":1}, 42]')).toThrow(/Row 2 is not an object/);
  });
});
