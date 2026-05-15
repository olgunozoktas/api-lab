/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type { HistoryItem, RequestSnapshot } from "../lib/types";
import { uid } from "../lib/utils";
import type { Store, StoreMutators } from "./types";

export type HistoryActions = {
  pushHistory: (
    snap: RequestSnapshot,
    status: number,
    sizeBytes: number,
    elapsedMs: number
  ) => void;
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
  pushHistory: (snap, status, sizeBytes, elapsedMs) =>
    set((s) => {
      const item: HistoryItem = {
        id: uid(),
        ts: Date.now(),
        request: snap,
        response: { status, sizeBytes, elapsedMs },
      };
      const next = [item, ...s.history];
      if (next.length > 200) next.length = 200;
      return { history: next };
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
