/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { prepareDiffBody, diffLines, diffStats, MAX_DIFF_LINES } from "../responseDiff";

describe("prepareDiffBody", () => {
  it("pretty-prints JSON with sorted keys", () => {
    const out = prepareDiffBody('{"b":2,"a":1}', "application/json");
    expect(out).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("normalises key order so a reorder is not a diff", () => {
    const left = prepareDiffBody('{"a":1,"b":2}', "application/json");
    const right = prepareDiffBody('{"b":2,"a":1}', "application/json");
    expect(left).toBe(right);
  });

  it("sorts nested object keys recursively", () => {
    const out = prepareDiffBody('{"z":{"y":1,"x":2}}', "application/json");
    expect(out).toBe('{\n  "z": {\n    "x": 2,\n    "y": 1\n  }\n}');
  });

  it("detects JSON by content even without a json content type", () => {
    const out = prepareDiffBody('{"a":1}', "text/plain");
    expect(out).toBe('{\n  "a": 1\n}');
  });

  it("returns invalid JSON unchanged", () => {
    expect(prepareDiffBody("{not json", "application/json")).toBe("{not json");
  });

  it("returns plain text unchanged", () => {
    expect(prepareDiffBody("hello\nworld", "text/plain")).toBe("hello\nworld");
  });
});

describe("diffLines", () => {
  it("marks every line equal for identical input", () => {
    const { rows } = diffLines("a\nb\nc", "a\nb\nc");
    expect(rows.every((r) => r.kind === "equal")).toBe(true);
    expect(rows).toHaveLength(3);
  });

  it("reports an added line", () => {
    const { rows } = diffLines("a\nc", "a\nb\nc");
    const added = rows.filter((r) => r.kind === "add");
    expect(added).toHaveLength(1);
    expect(added[0].right?.text).toBe("b");
    expect(added[0].left).toBeNull();
  });

  it("reports a removed line", () => {
    const { rows } = diffLines("a\nb\nc", "a\nc");
    const removed = rows.filter((r) => r.kind === "remove");
    expect(removed).toHaveLength(1);
    expect(removed[0].left?.text).toBe("b");
    expect(removed[0].right).toBeNull();
  });

  it("reports a changed line as one remove + one add", () => {
    const { rows } = diffLines("a\nb\nc", "a\nB\nc");
    expect(rows.filter((r) => r.kind === "remove")).toHaveLength(1);
    expect(rows.filter((r) => r.kind === "add")).toHaveLength(1);
  });

  it("carries 1-based line numbers", () => {
    const { rows } = diffLines("x\ny", "x\ny");
    expect(rows[0].left?.num).toBe(1);
    expect(rows[1].right?.num).toBe(2);
  });

  it("flags truncation past the line cap", () => {
    const big = Array.from({ length: MAX_DIFF_LINES + 50 }, (_, i) => `line ${i}`).join("\n");
    const { truncated, rows } = diffLines(big, big);
    expect(truncated).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(MAX_DIFF_LINES);
  });
});

describe("diffStats", () => {
  it("counts added and removed lines", () => {
    const stats = diffStats(diffLines("a\nb\nc", "a\nB\nc\nd"));
    expect(stats.removed).toBe(1);
    expect(stats.added).toBe(2);
    expect(stats.identical).toBe(false);
  });

  it("reports identical when nothing changed", () => {
    const stats = diffStats(diffLines("same\ntext", "same\ntext"));
    expect(stats.identical).toBe(true);
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
  });
});
