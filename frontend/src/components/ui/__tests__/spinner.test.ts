/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { spinnerVariants } from "../spinner";

describe("spinnerVariants", () => {
  it("always spins", () => {
    expect(spinnerVariants()).toContain("animate-spin");
    expect(spinnerVariants({ size: "lg" })).toContain("animate-spin");
  });

  it("defaults to the sm size", () => {
    expect(spinnerVariants()).toContain("h-3.5");
    expect(spinnerVariants()).toContain("w-3.5");
  });

  it("applies each named size", () => {
    expect(spinnerVariants({ size: "xs" })).toContain("h-3");
    expect(spinnerVariants({ size: "md" })).toContain("h-4");
    expect(spinnerVariants({ size: "lg" })).toContain("h-6");
  });
});
