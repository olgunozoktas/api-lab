/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { analyzeResponse, buildSeries, sortRows, formatCell, INDEX_KEY } from "../chartable";

describe("analyzeResponse — not-chartable paths", () => {
  it("rejects invalid JSON", () => {
    const a = analyzeResponse("{not json");
    expect(a.kind).toBe("not-chartable");
    if (a.kind === "not-chartable") expect(a.reason).toBe("invalid-json");
  });

  it("rejects an empty body", () => {
    const a = analyzeResponse("");
    expect(a.kind).toBe("not-chartable");
    if (a.kind === "not-chartable") expect(a.reason).toBe("invalid-json");
  });

  it("rejects a non-array JSON object", () => {
    const a = analyzeResponse('{"a":1}');
    expect(a.kind).toBe("not-chartable");
    if (a.kind === "not-chartable") expect(a.reason).toBe("not-array");
  });

  it("rejects a bare scalar", () => {
    const a = analyzeResponse("42");
    expect(a.kind).toBe("not-chartable");
    if (a.kind === "not-chartable") expect(a.reason).toBe("not-array");
  });

  it("rejects an empty array", () => {
    const a = analyzeResponse("[]");
    expect(a.kind).toBe("not-chartable");
    if (a.kind === "not-chartable") expect(a.reason).toBe("empty");
  });

  it("rejects an array of mixed primitives", () => {
    const a = analyzeResponse('["a", 1, true]');
    expect(a.kind).toBe("not-chartable");
    if (a.kind === "not-chartable") expect(a.reason).toBe("no-objects");
  });

  it("rejects an array of strings", () => {
    const a = analyzeResponse('["a", "b"]');
    expect(a.kind).toBe("not-chartable");
    if (a.kind === "not-chartable") expect(a.reason).toBe("no-objects");
  });

  it("rejects an array of arrays", () => {
    const a = analyzeResponse("[[1,2],[3,4]]");
    expect(a.kind).toBe("not-chartable");
    if (a.kind === "not-chartable") expect(a.reason).toBe("no-objects");
  });
});

describe("analyzeResponse — numeric array", () => {
  it("wraps a bare numeric array as an index + value series", () => {
    const a = analyzeResponse("[10, 20, 30]");
    expect(a.kind).toBe("chartable");
    if (a.kind !== "chartable") return;
    expect(a.numericColumns).toEqual(["value"]);
    expect(a.labelColumn).toBe(INDEX_KEY);
    expect(a.rows).toEqual([
      { [INDEX_KEY]: 0, value: 10 },
      { [INDEX_KEY]: 1, value: 20 },
      { [INDEX_KEY]: 2, value: 30 },
    ]);
  });

  it("treats NaN-producing entries as non-numeric (mixed → no-objects)", () => {
    // Infinity is not finite — JSON can't carry it, so this stays a
    // pure-number guard on the analyzer.
    const a = analyzeResponse("[1, 2.5, -3]");
    expect(a.kind).toBe("chartable");
  });
});

describe("analyzeResponse — array of objects", () => {
  it("detects numeric and label columns", () => {
    const body = JSON.stringify([
      { name: "Alice", sales: 10, region: "EU" },
      { name: "Bob", sales: 25, region: "US" },
    ]);
    const a = analyzeResponse(body);
    expect(a.kind).toBe("chartable");
    if (a.kind !== "chartable") return;
    expect(a.columns.map((c) => c.key)).toEqual(["name", "sales", "region"]);
    expect(a.numericColumns).toEqual(["sales"]);
    expect(a.labelColumn).toBe("name");
  });

  it("unions keys across heterogeneous rows in first-seen order", () => {
    const body = JSON.stringify([{ a: 1 }, { b: 2 }, { a: 3, c: 4 }]);
    const a = analyzeResponse(body);
    if (a.kind !== "chartable") throw new Error("expected chartable");
    expect(a.columns.map((c) => c.key)).toEqual(["a", "b", "c"]);
  });

  it("treats a column with null gaps but otherwise numbers as numeric", () => {
    const body = JSON.stringify([{ x: 1 }, { x: null }, { x: 3 }]);
    const a = analyzeResponse(body);
    if (a.kind !== "chartable") throw new Error("expected chartable");
    expect(a.numericColumns).toEqual(["x"]);
  });

  it("treats a column mixing numbers and strings as non-numeric", () => {
    const body = JSON.stringify([{ x: 1 }, { x: "two" }]);
    const a = analyzeResponse(body);
    if (a.kind !== "chartable") throw new Error("expected chartable");
    expect(a.numericColumns).toEqual([]);
  });

  it("yields no labelColumn when every column is numeric", () => {
    const body = JSON.stringify([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    const a = analyzeResponse(body);
    if (a.kind !== "chartable") throw new Error("expected chartable");
    expect(a.labelColumn).toBeNull();
    expect(a.numericColumns).toEqual(["a", "b"]);
  });

  it("stays chartable for all-string objects (table only, no numeric)", () => {
    const body = JSON.stringify([{ city: "Paris" }, { city: "Berlin" }]);
    const a = analyzeResponse(body);
    expect(a.kind).toBe("chartable");
    if (a.kind !== "chartable") return;
    expect(a.numericColumns).toEqual([]);
    expect(a.labelColumn).toBe("city");
  });

  it("rejects an array mixing objects and primitives", () => {
    const a = analyzeResponse('[{"a":1}, 2]');
    expect(a.kind).toBe("not-chartable");
    if (a.kind === "not-chartable") expect(a.reason).toBe("no-objects");
  });
});

describe("buildSeries", () => {
  const rows = [
    { name: "a", v: 5 },
    { name: "b", v: 12 },
  ];

  it("pairs labelColumn values with the numeric column", () => {
    expect(buildSeries(rows, "v", "name")).toEqual([
      { label: "a", value: 5 },
      { label: "b", value: 12 },
    ]);
  });

  it("falls back to row index when labelColumn is null", () => {
    expect(buildSeries(rows, "v", null)).toEqual([
      { label: "0", value: 5 },
      { label: "1", value: 12 },
    ]);
  });

  it("coerces non-numeric values to 0", () => {
    const s = buildSeries([{ name: "x", v: "nope" }], "v", "name");
    expect(s).toEqual([{ label: "x", value: 0 }]);
  });
});

describe("sortRows", () => {
  const rows = [
    { n: "c", num: 3 },
    { n: "a", num: 1 },
    { n: "b", num: 2 },
  ];

  it("sorts numeric columns ascending", () => {
    const out = sortRows(rows, "num", "asc", true);
    expect(out.map((r) => r.num)).toEqual([1, 2, 3]);
  });

  it("sorts numeric columns descending", () => {
    const out = sortRows(rows, "num", "desc", true);
    expect(out.map((r) => r.num)).toEqual([3, 2, 1]);
  });

  it("sorts string columns ascending", () => {
    const out = sortRows(rows, "n", "asc", false);
    expect(out.map((r) => r.n)).toEqual(["a", "b", "c"]);
  });

  it("pushes null/undefined values to the end regardless of direction", () => {
    const sparse = [{ x: 2 }, { x: null }, { x: 1 }];
    const asc = sortRows(sparse, "x", "asc", true);
    expect(asc.map((r) => r.x)).toEqual([1, 2, null]);
    const desc = sortRows(sparse, "x", "desc", true);
    expect(desc.map((r) => r.x)).toEqual([2, 1, null]);
  });

  it("is stable for tied values", () => {
    const tied = [
      { k: 1, id: "first" },
      { k: 1, id: "second" },
      { k: 1, id: "third" },
    ];
    const out = sortRows(tied, "k", "asc", true);
    expect(out.map((r) => r.id)).toEqual(["first", "second", "third"]);
  });

  it("does not mutate the input array", () => {
    const original = [...rows];
    sortRows(rows, "num", "desc", true);
    expect(rows).toEqual(original);
  });
});

describe("formatCell", () => {
  it("renders null and undefined distinctly", () => {
    expect(formatCell(null)).toBe("null");
    expect(formatCell(undefined)).toBe("");
  });

  it("stringifies nested objects and arrays compactly", () => {
    expect(formatCell({ a: 1 })).toBe('{"a":1}');
    expect(formatCell([1, 2])).toBe("[1,2]");
  });

  it("renders primitives as strings", () => {
    expect(formatCell(42)).toBe("42");
    expect(formatCell(true)).toBe("true");
    expect(formatCell("hi")).toBe("hi");
  });
});
