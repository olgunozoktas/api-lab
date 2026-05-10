import { splitFrontmatter } from "./markdown";
import type { Locale } from "./i18n";

export type ChangelogEntry = {
  // Stable identity per language variant — relative path inside
  // `changelog/`. Used as the React key.
  sourcePath: string;
  // Stable identity across languages — derived from filename minus
  // `.<lang>.md`. Two entries (e.g. `v0.1.0.en.md` + `v0.1.0.tr.md`)
  // share the same `slug`, used by selectChangelogEntries to pick the
  // active-locale variant.
  slug: string;
  // Language of this entry's body.
  lang: Locale;
  // Frontmatter `title:` (falls back to slug, then to filename).
  title: string;
  // Frontmatter `date:` (YYYY-MM-DD). Falls back to "" — those entries
  // sort last.
  date: string;
  // Inferred from the path: "released" | "unreleased".
  status: "released" | "unreleased";
  // Version label for released entries (e.g. "v0.4.0" from "released/v0.4.0.<lang>.md").
  // Empty string for unreleased entries.
  version: string;
  // Markdown body with frontmatter stripped.
  body: string;
};

// Vite's import.meta.glob bundles every match into the JS chunk at
// build time. `query: '?raw'` returns the file contents as a string;
// `eager: true` resolves immediately (no async per-entry read).
//
// Path shape (relative to this file at frontend/src/lib/changelog.ts):
//   ../../changelog/released/v0.1.0.en.md
//   ../../changelog/unreleased/2026-05-10-store-split.tr.md
//
// Filenames carry a `<lang>` suffix (en | tr); the parser treats
// unsuffixed legacy files as English so a partial migration doesn't
// blank out the modal.
const RELEASED = import.meta.glob<string>("../../changelog/released/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const UNRELEASED = import.meta.glob<string>("../../changelog/unreleased/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function basename(p: string): string {
  const slash = p.lastIndexOf("/");
  return slash >= 0 ? p.slice(slash + 1) : p;
}

const SUPPORTED_LANGS: Locale[] = ["en", "tr"];

function parseFilename(file: string): { stem: string; lang: Locale } {
  const noExt = file.replace(/\.md$/, "");
  const lastDot = noExt.lastIndexOf(".");
  if (lastDot > 0) {
    const candidate = noExt.slice(lastDot + 1);
    if ((SUPPORTED_LANGS as string[]).includes(candidate)) {
      return { stem: noExt.slice(0, lastDot), lang: candidate as Locale };
    }
  }
  return { stem: noExt, lang: "en" };
}

function parseEntry(path: string, raw: string, status: "released" | "unreleased"): ChangelogEntry {
  const { frontmatter, body } = splitFrontmatter(raw);
  const { stem, lang } = parseFilename(basename(path));
  const title = frontmatter.title || stem;
  const date = frontmatter.date || "";
  const version = status === "released" ? stem : "";
  // sourcePath is per-variant (one per language), slug is shared
  // across variants so the selector can group them.
  const sourcePath = `${status}/${stem}.${lang}.md`;
  return { sourcePath, slug: stem, lang, title, date, status, version, body };
}

// Compare two ISO-ish date strings ("YYYY-MM-DD"). Empty < anything.
function cmpDate(a: string, b: string): number {
  if (a === b) return 0;
  if (a === "") return 1; // a goes after b (sort last)
  if (b === "") return -1;
  return b.localeCompare(a); // newest first
}

function buildEntries(): ChangelogEntry[] {
  const all: ChangelogEntry[] = [];
  for (const [path, raw] of Object.entries(RELEASED)) {
    all.push(parseEntry(path, raw, "released"));
  }
  for (const [path, raw] of Object.entries(UNRELEASED)) {
    all.push(parseEntry(path, raw, "unreleased"));
  }
  return all;
}

const ALL_ENTRIES: ChangelogEntry[] = buildEntries();

// Pick the active-locale variant for each (status + slug). If the
// translation is missing for the active locale, falls back to English
// so the user sees something rather than a blank entry.
export function selectChangelogEntries(
  entries: ChangelogEntry[],
  locale: Locale
): ChangelogEntry[] {
  const byKey = new Map<string, Map<Locale, ChangelogEntry>>();
  for (const e of entries) {
    const key = `${e.status}/${e.slug}`;
    let langs = byKey.get(key);
    if (!langs) {
      langs = new Map();
      byKey.set(key, langs);
    }
    langs.set(e.lang, e);
  }
  const result: ChangelogEntry[] = [];
  for (const langs of byKey.values()) {
    const picked = langs.get(locale) ?? langs.get("en") ?? langs.values().next().value;
    if (picked) result.push(picked);
  }
  // Sort: newest date first; within identical dates, unreleased first
  // (so the working set surfaces above the matching dated release).
  result.sort((a, b) => {
    const d = cmpDate(a.date, b.date);
    if (d !== 0) return d;
    if (a.status !== b.status) return a.status === "unreleased" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
  return result;
}

// Backwards compatibility — earlier code imported this directly.
// New callers should use selectChangelogEntries(ALL_ENTRIES, locale).
export const CHANGELOG_ENTRIES: ChangelogEntry[] = ALL_ENTRIES;

// `__APP_VERSION__` is injected by `vite.config.ts`'s `define`.
declare const __APP_VERSION__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";

// Compare two semver-ish version strings. Tolerant of "v" prefix and
// missing trailing components ("0.1" vs "0.1.0"). Returns positive if
// a > b, negative if a < b, 0 if equal.
export function cmpVersion(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .replace(/^v/i, "")
      .split(".")
      .map((p) => parseInt(p, 10) || 0);
  const av = norm(a);
  const bv = norm(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const ai = av[i] ?? 0;
    const bi = bv[i] ?? 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

export function isNewer(current: string, lastSeen: string): boolean {
  return cmpVersion(current, lastSeen) > 0;
}

// Internal — exposed for tests so they can synthesize entries without
// touching the bundled glob.
export const _internal = { parseEntry, cmpDate, parseFilename };
