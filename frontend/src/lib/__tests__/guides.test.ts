/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { groupGuides, searchGuides, selectGuides, _internal, type GuideEntry } from "../guides";

const FIXTURES: GuideEntry[] = [
  {
    slug: "alpha",
    lang: "en",
    title: "Alpha basics",
    group: "Basics",
    order: 1,
    body: "intro alpha",
  },
  {
    slug: "beta",
    lang: "en",
    title: "Beta intermediate",
    group: "Basics",
    order: 2,
    body: "more beta",
  },
  {
    slug: "grpc",
    lang: "en",
    title: "gRPC reflection",
    group: "Protocols",
    order: 1,
    body: "grpcurl",
  },
  {
    slug: "ws",
    lang: "en",
    title: "WebSocket basics",
    group: "Protocols",
    order: 2,
    body: "ws://",
  },
];

describe("guides — parseEntry", () => {
  const { parseEntry } = _internal;

  it("uses frontmatter title + group + order", () => {
    const raw = `---
title: My guide
group: Composer
order: 5
---

guide body
`;
    const e = parseEntry("../guides/my-slug.md", raw);
    expect(e.slug).toBe("my-slug");
    expect(e.title).toBe("My guide");
    expect(e.group).toBe("Composer");
    expect(e.order).toBe(5);
    expect(e.body).toBe("guide body\n");
  });

  it("falls back to slug + General + 999 when frontmatter missing", () => {
    const e = parseEntry("../guides/no-fm.md", "just body\n");
    expect(e.slug).toBe("no-fm");
    expect(e.title).toBe("no-fm");
    expect(e.group).toBe("General");
    expect(e.order).toBe(999);
  });

  it("treats non-numeric order as 999", () => {
    const raw = `---\norder: not-a-number\n---\n\nbody`;
    const e = parseEntry("../guides/x.md", raw);
    expect(e.order).toBe(999);
  });
});

describe("guides — groupGuides", () => {
  it("groups by group field, alphabetically", () => {
    const groups = groupGuides(FIXTURES);
    expect(groups).toHaveLength(2);
    expect(groups[0].group).toBe("Basics");
    expect(groups[1].group).toBe("Protocols");
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].entries).toHaveLength(2);
  });

  it("preserves entry order within a group", () => {
    const groups = groupGuides(FIXTURES);
    expect(groups[0].entries[0].slug).toBe("alpha");
    expect(groups[0].entries[1].slug).toBe("beta");
  });

  it("returns empty array for no entries", () => {
    expect(groupGuides([])).toEqual([]);
  });
});

describe("guides — searchGuides", () => {
  it("returns all entries when query is empty", () => {
    expect(searchGuides(FIXTURES, "")).toEqual(FIXTURES);
    expect(searchGuides(FIXTURES, "   ")).toEqual(FIXTURES);
  });

  it("matches case-insensitively in title", () => {
    const r = searchGuides(FIXTURES, "ALPHA");
    expect(r).toHaveLength(1);
    expect(r[0].slug).toBe("alpha");
  });

  it("matches in group", () => {
    const r = searchGuides(FIXTURES, "protocol");
    expect(r).toHaveLength(2);
    expect(r.map((e) => e.slug)).toEqual(["grpc", "ws"]);
  });

  it("matches in body", () => {
    const r = searchGuides(FIXTURES, "grpcurl");
    expect(r).toHaveLength(1);
    expect(r[0].slug).toBe("grpc");
  });

  it("returns empty when no matches", () => {
    expect(searchGuides(FIXTURES, "nothing-here")).toEqual([]);
  });
});

describe("guides — selectGuides (locale picker)", () => {
  const MIXED: GuideEntry[] = [
    { slug: "a", lang: "en", title: "A (en)", group: "G", order: 1, body: "" },
    { slug: "a", lang: "tr", title: "A (tr)", group: "G", order: 1, body: "" },
    { slug: "b", lang: "en", title: "B (en)", group: "G", order: 2, body: "" },
    // No Turkish translation for `b` — selectGuides should fall back.
  ];

  it("picks the active-locale variant when present", () => {
    const r = selectGuides(MIXED, "tr");
    const a = r.find((e) => e.slug === "a");
    expect(a?.lang).toBe("tr");
    expect(a?.title).toBe("A (tr)");
  });

  it("falls back to en when the active-locale variant is missing", () => {
    const r = selectGuides(MIXED, "tr");
    const b = r.find((e) => e.slug === "b");
    expect(b?.lang).toBe("en");
    expect(b?.title).toBe("B (en)");
  });

  it("picks en when active locale is en", () => {
    const r = selectGuides(MIXED, "en");
    expect(r.every((e) => e.lang === "en")).toBe(true);
  });

  it("returns one entry per slug regardless of language count", () => {
    const r = selectGuides(MIXED, "tr");
    const slugs = r.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
