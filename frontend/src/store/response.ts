import type { StateCreator } from "zustand";
import type { ResponseSnapshot } from "../lib/types";
import type { Store, StoreMutators } from "./types";

export type ResponseActions = {
  setLastResponse: (r: ResponseSnapshot | null) => void;
  showToast: (msg: string) => void;
};

export const createResponseSlice: StateCreator<Store, StoreMutators, [], ResponseActions> = (
  set
) => ({
  setLastResponse: (r) =>
    set((s) => ({
      lastResponse: r,
      tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, lastResponse: r } : t)),
    })),

  showToast: (msg) => set({ toast: { msg, ts: Date.now() } }),
});
