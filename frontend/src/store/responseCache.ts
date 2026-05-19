/** Olgun Özoktaş geliştirdi · API Lab */
// Per-saved-request response memory. When a send completes for a
// request that has a saved CollectionItem id, its response is kept
// here keyed by that id — so re-selecting the request restores its
// last response instead of an empty panel (Postman-parity).
//
// Persisted: `responseCache` rides the store's `partialize` into
// IndexedDB, so a saved request's last response survives a relaunch.
// Because response bodies hit the ~1 MB native-bridge cap, the cache
// is bounded three ways — by entry count, by a per-entry byte ceiling
// (a single giant body is never cached), and by a total byte budget
// (oldest-evicted) — so it can't blow the IndexedDB store.
import type { ResponseSnapshot } from "../lib/types";

// Max cached responses. Beyond this the oldest-written entry is
// evicted. 30 covers a deep working set without an unbounded footprint.
export const RESPONSE_CACHE_CAP = 30;

// Per-entry ceiling. A single response larger than this is never
// cached at all — caching one near-1 MB body would crowd out dozens
// of normal-sized ones and isn't worth the budget.
export const RESPONSE_CACHE_MAX_ENTRY_BYTES = 256 * 1024;

// Total byte budget across every cached response. Eviction trims the
// oldest entries until the cache is under this, bounding what the
// persisted IndexedDB blob can grow to.
export const RESPONSE_CACHE_MAX_TOTAL_BYTES = 2 * 1024 * 1024;

// Cached responses older than this are dropped on hydrate. A
// fortnight-old response silently reappearing is more confusing than
// useful — by then the endpoint has likely moved on.
export const RESPONSE_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

// A cached response plus the wall-clock time it was stored. The
// timestamp exists only for TTL eviction on hydrate — the response
// snapshot itself carries durations, not a wall-clock instant.
export type CachedResponse = { response: ResponseSnapshot; cachedAt: number };

// Approximate byte size of a cached response. The text body and the
// base64 binary channel dominate; headers / metadata are negligible
// and ignored. String `.length` is a char count, close enough to a
// byte budget for cache-eviction purposes.
export function cachedResponseBytes(c: CachedResponse): number {
  return c.response.body.length + (c.response.bodyBase64?.length ?? 0);
}

// Insert `value` under `key` into a bounded record, returning a new
// record. Re-inserting an existing key moves it to most-recently-used;
// when the record exceeds `cap`, the oldest entries are evicted from
// the front. Pure — never mutates the input.
export function putBounded<T>(
  cache: Record<string, T>,
  key: string,
  value: T,
  cap: number
): Record<string, T> {
  // Rebuild without `key` so a re-insert lands at the end (MRU).
  const next: Record<string, T> = {};
  for (const k of Object.keys(cache)) {
    if (k !== key) next[k] = cache[k];
  }
  next[key] = value;

  const keys = Object.keys(next);
  if (keys.length <= cap) return next;

  // Over capacity — drop the oldest (front) entries.
  const trimmed: Record<string, T> = {};
  for (let i = keys.length - cap; i < keys.length; i++) {
    trimmed[keys[i]] = next[keys[i]];
  }
  return trimmed;
}

// Byte-aware bounded insert. Like `putBounded`, but also enforces a
// per-entry ceiling and a total byte budget:
//   - a value bigger than `maxEntryBytes` is rejected outright — the
//     cache is returned untouched rather than evicting good entries
//     to make room for one oversized one;
//   - after the MRU insert, the oldest (front) entries are evicted
//     until the cache is under BOTH `cap` and `maxTotalBytes`.
// The just-inserted entry sits at the back, so it always survives.
// Pure — never mutates the input.
export function putBoundedBytes<T>(
  cache: Record<string, T>,
  key: string,
  value: T,
  opts: { cap: number; maxEntryBytes: number; maxTotalBytes: number; sizeOf: (v: T) => number }
): Record<string, T> {
  if (opts.sizeOf(value) > opts.maxEntryBytes) return cache;

  // MRU rebuild — re-inserted key lands at the end.
  const next: Record<string, T> = {};
  for (const k of Object.keys(cache)) {
    if (k !== key) next[k] = cache[k];
  }
  next[key] = value;

  const keys = Object.keys(next);
  let total = keys.reduce((sum, k) => sum + opts.sizeOf(next[k]), 0);
  // Walk the front, dropping oldest entries until both bounds hold.
  let drop = 0;
  while (drop < keys.length && (keys.length - drop > opts.cap || total > opts.maxTotalBytes)) {
    total -= opts.sizeOf(next[keys[drop]]);
    drop++;
  }
  if (drop === 0) return next;

  const trimmed: Record<string, T> = {};
  for (let i = drop; i < keys.length; i++) trimmed[keys[i]] = next[keys[i]];
  return trimmed;
}

// Drop cached responses stored longer ago than `ttlMs`. Called on
// hydrate so a relaunch doesn't resurrect long-dead responses. Pure —
// returns a new record, never mutates the input. `now` is injected so
// the eviction is deterministically testable.
export function pruneStale(
  cache: Record<string, CachedResponse>,
  ttlMs: number,
  now: number
): Record<string, CachedResponse> {
  const fresh: Record<string, CachedResponse> = {};
  for (const k of Object.keys(cache)) {
    if (now - cache[k].cachedAt <= ttlMs) fresh[k] = cache[k];
  }
  return fresh;
}
