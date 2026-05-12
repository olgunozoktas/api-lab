/** Olgun Özoktaş geliştirdi · API Lab */
import { splitFrontmatter } from "./markdown";
import type { Locale } from "./i18n";

export type GuideEntry = {
  // Stable React key + URL fragment. Same across language variants.
  slug: string;
  // Language of this entry's body. Filtered against active locale at
  // render time; one entry per language per slug lives in the bundle.
  lang: Locale;
  // Display title (frontmatter `title:`, falls back to slug).
  title: string;
  // Group heading in the sidebar (frontmatter `group:`, defaults to "General").
  group: string;
  // Ordering within the group (frontmatter `order:`, defaults to 999).
  order: number;
  // Markdown body with frontmatter stripped.
  body: string;
};

// Build-time glob — every `<slug>.<lang>.md` under `frontend/src/guides/`
// becomes part of the bundle. The `<lang>` suffix is mandatory; an
// older flat `.md` filename is treated as English by the parser
// fallback so partial migrations don't blank the modal.
const GUIDE_FILES = import.meta.glob<string>("../guides/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function basename(p: string): string {
  const slash = p.lastIndexOf("/");
  return slash >= 0 ? p.slice(slash + 1) : p;
}

// Split a filename of shape `<stem>.<lang>.md` into `[stem, lang]`.
// If no `.<lang>.` suffix is present, returns `[file-without-md, "en"]`
// so legacy unsuffixed files keep working as English defaults.
const SUPPORTED_LANGS: Locale[] = ["en", "tr"];

function parseFilename(file: string): { slug: string; lang: Locale } {
  const noExt = file.replace(/\.md$/, "");
  const lastDot = noExt.lastIndexOf(".");
  if (lastDot > 0) {
    const candidate = noExt.slice(lastDot + 1);
    if ((SUPPORTED_LANGS as string[]).includes(candidate)) {
      return { slug: noExt.slice(0, lastDot), lang: candidate as Locale };
    }
  }
  return { slug: noExt, lang: "en" };
}

function parseEntry(path: string, raw: string): GuideEntry {
  const { frontmatter, body } = splitFrontmatter(raw);
  const { slug, lang } = parseFilename(basename(path));
  const orderRaw = frontmatter.order ? parseInt(frontmatter.order, 10) : NaN;
  const order = Number.isFinite(orderRaw) ? orderRaw : 999;
  return {
    slug,
    lang,
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

// Pick the active-locale variant for each slug. If a translation is
// missing for the active locale, falls back to English so the user
// sees something rather than a blank entry.
export function selectGuides(entries: GuideEntry[], locale: Locale): GuideEntry[] {
  const bySlug = new Map<string, Map<Locale, GuideEntry>>();
  for (const e of entries) {
    let langs = bySlug.get(e.slug);
    if (!langs) {
      langs = new Map();
      bySlug.set(e.slug, langs);
    }
    langs.set(e.lang, e);
  }
  const result: GuideEntry[] = [];
  for (const langs of bySlug.values()) {
    const picked = langs.get(locale) ?? langs.get("en") ?? langs.values().next().value;
    if (picked) result.push(picked);
  }
  result.sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });
  return result;
}

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
export const _internal = { parseEntry, parseFilename };
