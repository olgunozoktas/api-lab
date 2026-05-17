/** Olgun Özoktaş geliştirdi · API Lab */
//
// Response-body retention for history entries. History caps at 200
// entries; the whole zustand store serialises to one IndexedDB blob on
// every mutation, so retained bodies must stay bounded — otherwise a
// long session of large responses bloats every persist write.
//
// Two limits keep it bounded:
//   - HISTORY_BODY_MAX_BYTES — per-entry hard cap. A body bigger than
//     this is never stored (one giant response can't eat the budget).
//   - HISTORY_BODY_BUDGET_BYTES — total retained-body budget across the
//     whole list. Newest entries keep their body; once the running sum
//     crosses the budget, older entries have their body evicted.
//
// Entries past either limit keep their metadata (status/size/timing) —
// only the `body` string is dropped, with `bodyOmitted` recording why.

import type { HistoryItem, ResponseSnapshot } from "./types";

// Per-entry hard cap. 256 KiB comfortably covers typical JSON / text
// API responses; the rare giant payload is dropped to a marker.
export const HISTORY_BODY_MAX_BYTES = 256 * 1024;

// Total retained-body budget across all 200 entries. Bounds the extra
// weight retained bodies add to the persisted IDB blob.
export const HISTORY_BODY_BUDGET_BYTES = 2 * 1024 * 1024;

// UTF-8 byte length of a string. `TextEncoder` is available in the
// WebKit host; `.length` alone undercounts multi-byte characters.
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export type RetainedBody = {
  body?: string;
  contentType?: string;
  bodyOmitted?: "too-large" | "binary" | "budget";
};

// Decide what a fresh history entry should retain from its response.
// Binary responses (image/audio/video/PDF — flagged by the native
// bridge) are not text-diffable, so only a marker is kept. A body over
// the per-entry cap is likewise dropped to a marker.
export function extractRetainableBody(r: ResponseSnapshot): RetainedBody {
  if (r.bodyBase64 || r.bodyTooLarge) return { bodyOmitted: "binary" };
  if (byteLength(r.body) > HISTORY_BODY_MAX_BYTES) return { bodyOmitted: "too-large" };
  return { body: r.body, contentType: r.contentType };
}

// Walk the list newest→oldest, summing retained body bytes. Once the
// running total crosses the budget, every older entry that still holds
// a body has it evicted (`bodyOmitted: "budget"`). Returns a new array;
// entries are only cloned when their body actually changes.
export function applyBodyBudget(items: HistoryItem[]): HistoryItem[] {
  let used = 0;
  let overBudget = false;
  return items.map((item) => {
    const { body, bodyOmitted } = item.response;
    if (body === undefined) return item;
    if (overBudget) {
      return {
        ...item,
        response: {
          status: item.response.status,
          sizeBytes: item.response.sizeBytes,
          elapsedMs: item.response.elapsedMs,
          bodyOmitted: "budget" as const,
        },
      };
    }
    used += byteLength(body);
    if (used > HISTORY_BODY_BUDGET_BYTES) {
      // This entry tipped the sum over — evict it too, then mark every
      // older entry as budget-evicted.
      overBudget = true;
      return {
        ...item,
        response: {
          status: item.response.status,
          sizeBytes: item.response.sizeBytes,
          elapsedMs: item.response.elapsedMs,
          bodyOmitted: "budget" as const,
        },
      };
    }
    // Within budget — keep as-is (including any pre-existing marker).
    void bodyOmitted;
    return item;
  });
}
