import { splitFrontmatter } from "./markdown";

export type GuideEntry = {
  // Stable React key + URL fragment.
  slug: string;
  // Display title (frontmatter `title:`, falls back to slug).
  title: string;
  // Group heading in the sidebar (frontmatter `group:`, defaults to "General").
  group: string;
  // Ordering within the group (frontmatter `order:`, defaults to 999).
  order: number;
  // Markdown body with frontmatter stripped.
  body: string;
};

// Build-time glob — every .md under `frontend/src/guides/` becomes
// part of the bundle.
const GUIDE_FILES = import.meta.glob<string>("../guides/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function basename(p: string): string {
  const slash = p.lastIndexOf("/");
  return slash >= 0 ? p.slice(slash + 1) : p;
}

function parseEntry(path: string, raw: string): GuideEntry {
  const { frontmatter, body } = splitFrontmatter(raw);
  const slug = basename(path).replace(/\.md$/, "");
  const orderRaw = frontmatter.order ? parseInt(frontmatter.order, 10) : NaN;
  const order = Number.isFinite(orderRaw) ? orderRaw : 999;
  return {
    slug,
    title: frontmatter.title || slug,
    group: frontmatter.group || "General",
    order,
    body,
  };
}

function buildGuides(): GuideEntry[] {
  const all: GuideEntry[] = [];
  for (const [path, raw] of Object.entries(GUIDE_FILES)) {
    all.push(parseEntry(path, raw));
  }
  // Sort by group (alphabetical) then order then title.
  all.sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });
  return all;
}

export const GUIDES: GuideEntry[] = buildGuides();

// Group guides by `group` field for sidebar rendering.
export type GuideGroup = { group: string; entries: GuideEntry[] };

export function groupGuides(entries: GuideEntry[]): GuideGroup[] {
  const map = new Map<string, GuideEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.group) ?? [];
    arr.push(e);
    map.set(e.group, arr);
  }
  return Array.from(map.entries())
    .map(([group, list]) => ({ group, entries: list }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

// Case-insensitive substring search across title + group + body.
export function searchGuides(entries: GuideEntry[], query: string): GuideEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => {
    return (
      e.title.toLowerCase().includes(q) ||
      e.group.toLowerCase().includes(q) ||
      e.body.toLowerCase().includes(q)
    );
  });
}

// Internal — for tests.
export const _internal = { parseEntry };
