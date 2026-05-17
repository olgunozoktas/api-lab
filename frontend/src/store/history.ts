/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type { HistoryItem, RequestSnapshot, ResponseSnapshot } from "../lib/types";
import { uid } from "../lib/utils";
import { applyBodyBudget, extractRetainableBody } from "../lib/historyBody";
import type { Store, StoreMutators } from "./types";

export type HistoryActions = {
  // Records a completed request. The full ResponseSnapshot is passed so
  // history can retain the response body (within a size budget — see
  // lib/historyBody.ts) for the side-by-side diff feature.
  pushHistory: (snap: RequestSnapshot, response: ResponseSnapshot) => void;
  // Batch-prepend a list of already-built HistoryItems to the top of
  // the queue. Used by the HAR importer — a HAR can carry dozens or
  // hundreds of entries, so we avoid the per-call cap reshuffle and
  // a single set() commits the whole batch atomically.
  importHistory: (items: HistoryItem[]) => void;
  clearHistory: () => void;
  removeHistoryItem: (id: string) => void;
};

export const createHistorySlice: StateCreator<Store, StoreMutators, [], HistoryActions> = (
  set
) => ({
  pushHistory: (snap, response) =>
    set((s) => {
      const item: HistoryItem = {
        id: uid(),
        ts: Date.now(),
        request: snap,
        response: {
          status: response.status,
          sizeBytes: response.sizeBytes,
          elapsedMs: response.elapsedMs,
          ...extractRetainableBody(response),
        },
      };
      const next = [item, ...s.history];
      if (next.length > 200) next.length = 200;
      // Re-apply the retained-body budget after prepending — the new
      // entry may push older bodies past the total budget.
      return { history: applyBodyBudget(next) };
    }),

  importHistory: (items) =>
    set((s) => {
      if (items.length === 0) return {};
      const next = [...items, ...s.history];
      if (next.length > 200) next.length = 200;
      return { history: next };
    }),

  clearHistory: () => set({ history: [] }),

  removeHistoryItem: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
});
