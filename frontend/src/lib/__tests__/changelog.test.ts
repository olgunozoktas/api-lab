/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { cmpVersion, isNewer } from "../changelog";
import { selectChangelogEntries, _internal } from "../changelogEntries";

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
  const { parseEntry, cmpDate, parseFilename } = _internal;

  it("parseFilename extracts <stem>.<lang>.md", () => {
    expect(parseFilename("v0.1.0.en.md")).toEqual({ stem: "v0.1.0", lang: "en" });
    expect(parseFilename("2026-05-10-store-split.tr.md")).toEqual({
      stem: "2026-05-10-store-split",
      lang: "tr",
    });
  });

  it("parseFilename defaults to en when no lang suffix", () => {
    expect(parseFilename("v0.1.0.md")).toEqual({ stem: "v0.1.0", lang: "en" });
  });

  it("parseEntry uses frontmatter title + date and tracks slug + lang", () => {
    const raw = `---
title: My ship
date: 2026-05-10
---

body line
`;
    const e = parseEntry("../../../changelog/unreleased/some-slug.en.md", raw, "unreleased");
    expect(e.title).toBe("My ship");
    expect(e.date).toBe("2026-05-10");
    expect(e.status).toBe("unreleased");
    expect(e.version).toBe("");
    expect(e.slug).toBe("some-slug");
    expect(e.lang).toBe("en");
    expect(e.body).toBe("body line\n");
    expect(e.sourcePath).toBe("unreleased/some-slug.en.md");
  });

  it("parseEntry parses Turkish variant from .tr.md", () => {
    const raw = `---\ntitle: Sürüm\ndate: 2026-05-10\n---\n\nüçüncü satır`;
    const e = parseEntry("../../../changelog/unreleased/some-slug.tr.md", raw, "unreleased");
    expect(e.lang).toBe("tr");
    expect(e.slug).toBe("some-slug");
    expect(e.title).toBe("Sürüm");
  });

  it("parseEntry derives version from released filename", () => {
    const raw = `---\ntitle: First release\ndate: 2026-05-09\n---\n\n`;
    const e = parseEntry("../../../changelog/released/v0.1.0.en.md", raw, "released");
    expect(e.status).toBe("released");
    expect(e.version).toBe("v0.1.0");
  });

  it("parseEntry falls back to filename when no frontmatter", () => {
    const e = parseEntry("../../../changelog/unreleased/no-fm.en.md", "just body\n", "unreleased");
    expect(e.title).toBe("no-fm");
    expect(e.date).toBe("");
  });

  it("cmpDate sorts newest first; empty dates last", () => {
    const dates = ["2026-05-09", "", "2026-05-10", "2026-04-30"];
    const sorted = dates.slice().sort(cmpDate);
    expect(sorted).toEqual(["2026-05-10", "2026-05-09", "2026-04-30", ""]);
  });
});

describe("changelog selectChangelogEntries (locale picker)", () => {
  // Synthesize entries directly rather than going through parseEntry.
  const fixtures = [
    {
      sourcePath: "released/v0.1.0.en.md",
      slug: "v0.1.0",
      lang: "en" as const,
      title: "Initial release",
      date: "2026-05-09",
      status: "released" as const,
      version: "v0.1.0",
      body: "english body",
    },
    {
      sourcePath: "released/v0.1.0.tr.md",
      slug: "v0.1.0",
      lang: "tr" as const,
      title: "İlk sürüm",
      date: "2026-05-09",
      status: "released" as const,
      version: "v0.1.0",
      body: "türkçe body",
    },
    {
      sourcePath: "unreleased/2026-05-10-foo.en.md",
      slug: "2026-05-10-foo",
      lang: "en" as const,
      title: "Foo",
      date: "2026-05-10",
      status: "unreleased" as const,
      version: "",
      body: "no tr translation",
    },
  ];

  it("picks the active-locale variant when present", () => {
    const r = selectChangelogEntries(fixtures, "tr");
    const released = r.find((e: { slug: string }) => e.slug === "v0.1.0");
    expect(released?.lang).toBe("tr");
    expect(released?.title).toBe("İlk sürüm");
  });

  it("falls back to en when no translation exists", () => {
    const r = selectChangelogEntries(fixtures, "tr");
    const foo = r.find((e: { slug: string }) => e.slug === "2026-05-10-foo");
    expect(foo?.lang).toBe("en");
  });

  it("returns one entry per slug regardless of variant count", () => {
    const r = selectChangelogEntries(fixtures, "en");
    expect(r).toHaveLength(2); // v0.1.0 + 2026-05-10-foo
  });
});
