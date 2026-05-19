/** Olgun Özoktaş geliştirdi · API Lab */
// Light version helpers — APP_VERSION, build date, semver compare.
// Deliberately import-free and tiny so the TopBar, Settings, the
// update check, and the changelog auto-open gate can pull these
// eagerly into the first-paint chunk WITHOUT dragging in the
// changelog markdown corpus. The heavy glob + entry model lives in
// `lib/changelogEntries.ts`, imported only by the lazy <ChangelogModal>.

// `__APP_VERSION__` is injected by `vite.config.ts`'s `define`.
declare const __APP_VERSION__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";

// `__BUILD_DATE__` is captured at vite.config.ts load time on each
// build (ISO-8601 string). Empty string in tests / vitest runs where
// the define isn't injected.
declare const __BUILD_DATE__: string;
export const BUILD_DATE: string = typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "";

// Render the build date in the user's locale + short style. Returns
// an empty string when the date is unavailable, so callers can safely
// concatenate without a fallback dance.
export function formatBuildDate(date: string = BUILD_DATE): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
