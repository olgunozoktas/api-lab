/** Olgun Özoktaş geliştirdi · API Lab */
// Per-saved-request response memory. When a send completes for a
// request that has a saved CollectionItem id, its response is kept
// here keyed by that id — so re-selecting the request restores its
// last response instead of an empty panel (Postman-parity).
//
// Session-only: `responseCache` is NOT in the store's `partialize`,
// so it never touches the IndexedDB budget and resets on relaunch.
// Bounded by entry count — response bodies can be ~1 MB each (the
// native bridge cap), so an unbounded map would grow without limit.

// Max cached responses. Beyond this the oldest-written entry is
// evicted. 30 covers a deep working set without an unbounded footprint.
export const RESPONSE_CACHE_CAP = 30;

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
