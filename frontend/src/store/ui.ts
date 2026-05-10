import type { StateCreator } from "zustand";
import type { OpenTab, RequestDefaults, UiState } from "../lib/types";
import type { Locale } from "../lib/i18n";
import type { Store, StoreMutators } from "./types";

export type UiActions = {
  setUi: (patch: Partial<UiState>) => void;
  setLocale: (l: Locale) => void;
  setDefaults: (patch: Partial<RequestDefaults>) => void;
};

export const createUiSlice: StateCreator<Store, StoreMutators, [], UiActions> = (set) => ({
  setUi: (patch) =>
    set((s) => {
      const nextUi = { ...s.ui, ...patch };
      const tabPatch: Partial<OpenTab> = {};
      if (patch.composerTab !== undefined) tabPatch.composerTab = patch.composerTab;
      if (patch.responseTab !== undefined) tabPatch.responseTab = patch.responseTab;
      if (Object.keys(tabPatch).length === 0) return { ui: nextUi };
      return {
        ui: nextUi,
        tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, ...tabPatch } : t)),
      };
    }),

  setLocale: (locale) => set({ locale }),

  setDefaults: (patch) =>
    set((s) => ({
      defaults: { ...s.defaults, ...patch },
    })),
});
