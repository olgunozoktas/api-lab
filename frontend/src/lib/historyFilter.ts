/** Olgun Özoktaş geliştirdi · API Lab */
// Smart-parse the History tab's search query into structured filters:
// HTTP method (leading verb), status code (3-digit number), URL substring.
// Pure helpers — no DOM, no React; unit-tested in __tests__/historyFilter.test.ts.

import type { HistoryItem } from "./types";

export type ParsedHistoryQuery = {
  method?: string; // canonical UPPER-CASE HTTP verb
  status?: number; // 3-digit HTTP status code
  urlSubstring: string; // remaining tokens, lowercased + trimmed
};

const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE",
  "CONNECT",
]);

// Parse the user's free-text search into structured filters.
// Examples:
//   ""                    → {urlSubstring: ""}
//   "users"               → {urlSubstring: "users"}
//   "GET"                 → {method: "GET", urlSubstring: ""}
//   "POST users"          → {method: "POST", urlSubstring: "users"}
//   "404"                 → {status: 404, urlSubstring: ""}
//   "GET 401 login"       → {method: "GET", status: 401, urlSubstring: "login"}
//   "post 2"              → {method: "POST", urlSubstring: "2"}    // "2" alone isn't 3 digits
export function parseHistoryQuery(q: string): ParsedHistoryQuery {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { urlSubstring: "" };

  let method: string | undefined;
  let status: number | undefined;
  const remaining: string[] = [];

  for (const tok of tokens) {
    const upper = tok.toUpperCase();
    if (!method && HTTP_METHODS.has(upper)) {
      method = upper;
      continue;
    }
    if (!status && /^\d{3}$/.test(tok)) {
      const n = Number(tok);
      if (n >= 100 && n <= 599) {
        status = n;
        continue;
      }
    }
    remaining.push(tok);
  }

  return {
    method,
    status,
    urlSubstring: remaining.join(" ").toLowerCase(),
  };
}

// Does a HistoryItem match the parsed query? AND-semantics across the
// three filter slots — every set filter must pass.
export function matchesHistoryQuery(item: HistoryItem, parsed: ParsedHistoryQuery): boolean {
  if (parsed.method && item.request.method.toUpperCase() !== parsed.method) return false;
  if (typeof parsed.status === "number") {
    const got = item.response?.status ?? 0;
    if (got !== parsed.status) return false;
  }
  if (parsed.urlSubstring.length > 0) {
    // Defensive: lowercase both sides. The parser already lowercases its
    // output, but direct callers might not — keep this symmetric.
    const needle = parsed.urlSubstring.toLowerCase();
    if (!item.request.url.toLowerCase().includes(needle)) return false;
  }
  return true;
}

// Convenience: parse + filter in one call. Returns the matching items
// in the original order. Empty query → returns input unchanged (no clone).
export function filterHistory(items: HistoryItem[], query: string): HistoryItem[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return items;
  const parsed = parseHistoryQuery(trimmed);
  return items.filter((it) => matchesHistoryQuery(it, parsed));
}
