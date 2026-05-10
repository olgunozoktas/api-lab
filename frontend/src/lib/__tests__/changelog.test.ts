import { describe, it, expect } from "vitest";
import { cmpVersion, isNewer, _internal } from "../changelog";

describe("changelog version compare", () => {
  it("cmpVersion handles equal versions", () => {
    expect(cmpVersion("1.2.3", "1.2.3")).toBe(0);
    expect(cmpVersion("v1.2.3", "1.2.3")).toBe(0); // 'v' prefix tolerated
  });

  it("cmpVersion handles missing trailing components", () => {
    expect(cmpVersion("1.2", "1.2.0")).toBe(0);
    expect(cmpVersion("1", "1.0.0")).toBe(0);
  });

  it("cmpVersion returns positive when a > b", () => {
    expect(cmpVersion("1.2.4", "1.2.3")).toBeGreaterThan(0);
    expect(cmpVersion("2.0.0", "1.99.99")).toBeGreaterThan(0);
  });

  it("cmpVersion returns negative when a < b", () => {
    expect(cmpVersion("1.2.3", "1.2.4")).toBeLessThan(0);
    expect(cmpVersion("0.0.0", "0.1.0")).toBeLessThan(0);
  });

  it("isNewer returns true on upgrade", () => {
    expect(isNewer("0.2.0", "0.1.0")).toBe(true);
    expect(isNewer("1.0.0", "0.0.0")).toBe(true);
  });

  it("isNewer returns false on same or older", () => {
    expect(isNewer("0.1.0", "0.1.0")).toBe(false);
    expect(isNewer("0.1.0", "0.2.0")).toBe(false);
  });
});

describe("changelog entry parsing", () => {
  const { parseEntry, cmpDate } = _internal;

  it("parseEntry uses frontmatter title + date", () => {
    const raw = `---
title: My ship
date: 2026-05-10
---

body line
`;
    const e = parseEntry("../../../changelog/unreleased/some-slug.md", raw, "unreleased");
    expect(e.title).toBe("My ship");
    expect(e.date).toBe("2026-05-10");
    expect(e.status).toBe("unreleased");
    expect(e.version).toBe("");
    expect(e.body).toBe("body line\n");
    expect(e.sourcePath).toBe("unreleased/some-slug.md");
  });

  it("parseEntry derives version from released filename", () => {
    const raw = `---\ntitle: First release\ndate: 2026-05-09\n---\n\n`;
    const e = parseEntry("../../../changelog/released/v0.1.0.md", raw, "released");
    expect(e.status).toBe("released");
    expect(e.version).toBe("v0.1.0");
  });

  it("parseEntry falls back to filename when no frontmatter", () => {
    const e = parseEntry("../../../changelog/unreleased/no-fm.md", "just body\n", "unreleased");
    expect(e.title).toBe("no-fm");
    expect(e.date).toBe("");
  });

  it("cmpDate sorts newest first; empty dates last", () => {
    const dates = ["2026-05-09", "", "2026-05-10", "2026-04-30"];
    const sorted = dates.slice().sort(cmpDate);
    expect(sorted).toEqual(["2026-05-10", "2026-05-09", "2026-04-30", ""]);
  });
});
