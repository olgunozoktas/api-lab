/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { clampDividerValue } from "../../components/ResizableDivider";

describe("clampDividerValue", () => {
  it("returns input when in range", () => {
    expect(clampDividerValue(250, 180, 400)).toBe(250);
  });

  it("clamps below min to min", () => {
    expect(clampDividerValue(100, 180, 400)).toBe(180);
    expect(clampDividerValue(-50, 180, 400)).toBe(180);
  });

  it("clamps above max to max", () => {
    expect(clampDividerValue(500, 180, 400)).toBe(400);
    expect(clampDividerValue(99999, 180, 400)).toBe(400);
  });

  it("respects exact min and max", () => {
    expect(clampDividerValue(180, 180, 400)).toBe(180);
    expect(clampDividerValue(400, 180, 400)).toBe(400);
  });

  it("NaN-safe: returns min", () => {
    expect(clampDividerValue(NaN, 180, 400)).toBe(180);
  });
});
