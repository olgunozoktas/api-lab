import { splitFrontmatter } from "./markdown";

export type ChangelogEntry = {
  // Stable identity — relative path inside `changelog/`. Used as the
  // React key and for memoizing rendered HTML.
  sourcePath: string;
  // Frontmatter `title:` (falls back to first H1, then to filename).
  title: string;
  // Frontmatter `date:` (YYYY-MM-DD). Falls back to "" — those entries
  // sort last.
  date: string;
  // Inferred from the path: "released" | "unreleased".
  status: "released" | "unreleased";
  // Version label for released entries (e.g. "v0.4.0" from "released/v0.4.0.md").
  // Empty string for unreleased entries.
  version: string;
  // Markdown body with frontmatter stripped.
  body: string;
};

// Vite's import.meta.glob bundles every match into the JS chunk at
// build time. `query: '?raw'` returns the file contents as a string;
// `eager: true` resolves immediately (no async per-entry read).
//
// Path shape (relative to vite.config.ts which is at frontend/):
//   ../changelog/released/v0.1.0.md
//   ../changelog/unreleased/2026-05-10-store-split.md
const RELEASED = import.meta.glob<string>("../../../changelog/released/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const UNRELEASED = import.meta.glob<string>("../../../changelog/unreleased/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function basename(p: string): string {
  const slash = p.lastIndexOf("/");
  return slash >= 0 ? p.slice(slash + 1) : p;
}

function parseEntry(path: string, raw: string, status: "released" | "unreleased"): ChangelogEntry {
  const { frontmatter, body } = splitFrontmatter(raw);
  const file = basename(path).replace(/\.md$/, "");
  const title = frontmatter.title || file;
  const date = frontmatter.date || "";
  const version = status === "released" ? file : "";
  // Stable, short sourcePath for React keys + cache lookup.
  const sourcePath = `${status}/${file}.md`;
  return { sourcePath, title, date, status, version, body };
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
  // Sort: newest date first; within identical dates, unreleased first
  // (so the working set surfaces above the matching dated release).
  all.sort((a, b) => {
    const d = cmpDate(a.date, b.date);
    if (d !== 0) return d;
    if (a.status !== b.status) return a.status === "unreleased" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
  return all;
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = buildEntries();

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
export const _internal = { parseEntry, cmpDate };
