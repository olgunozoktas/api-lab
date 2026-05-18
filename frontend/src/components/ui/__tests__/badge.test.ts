/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { badgeVariants, methodBadgeTone, statusBadgeTone } from "../badge";

describe("methodBadgeTone", () => {
  it("maps every known verb", () => {
    expect(methodBadgeTone("GET")).toBe("success");
    expect(methodBadgeTone("POST")).toBe("warning");
    expect(methodBadgeTone("PUT")).toBe("info");
    expect(methodBadgeTone("PATCH")).toBe("purple");
    expect(methodBadgeTone("DELETE")).toBe("danger");
  });

  it("is case-insensitive", () => {
    expect(methodBadgeTone("get")).toBe("success");
    expect(methodBadgeTone("Delete")).toBe("danger");
  });

  it("falls back to neutral for unknown verbs", () => {
    expect(methodBadgeTone("TRACE")).toBe("neutral");
    expect(methodBadgeTone("")).toBe("neutral");
  });
});

describe("statusBadgeTone", () => {
  it("maps each class band", () => {
    expect(statusBadgeTone(200)).toBe("success");
    expect(statusBadgeTone(301)).toBe("success"); // 3xx shares the 2xx tone
    expect(statusBadgeTone(404)).toBe("warning");
    expect(statusBadgeTone(500)).toBe("danger");
  });

  it("handles boundary codes", () => {
    expect(statusBadgeTone(199)).toBe("neutral");
    expect(statusBadgeTone(100)).toBe("neutral");
    expect(statusBadgeTone(399)).toBe("success");
    expect(statusBadgeTone(499)).toBe("warning");
    expect(statusBadgeTone(599)).toBe("danger");
  });
});

describe("badgeVariants", () => {
  it("applies defaults (neutral + md) when no props given", () => {
    const cls = badgeVariants();
    expect(cls).toContain("text-[var(--color-fg-muted)]");
    expect(cls).toContain("text-xs");
  });

  it("applies the requested tone", () => {
    expect(badgeVariants({ tone: "danger" })).toContain("text-[var(--color-danger)]");
    expect(badgeVariants({ tone: "success" })).toContain("text-[var(--color-success)]");
  });

  it("applies the requested size", () => {
    expect(badgeVariants({ size: "sm" })).toContain("text-3xs");
  });
});
