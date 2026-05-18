/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type { Store, StoreMutators } from "./types";

// Integration enable/disable. `enabledIntegrations` (a list of
// registry ids) lives on CoreState and persists via `partialize`.
export type IntegrationsActions = {
  enableIntegration: (id: string) => void;
  disableIntegration: (id: string) => void;
};

export const createIntegrationsSlice: StateCreator<
  Store,
  StoreMutators,
  [],
  IntegrationsActions
> = (set) => ({
  enableIntegration: (id) =>
    set((s) => ({
      enabledIntegrations: s.enabledIntegrations.includes(id)
        ? s.enabledIntegrations
        : [...s.enabledIntegrations, id],
    })),
  disableIntegration: (id) =>
    set((s) => ({
      enabledIntegrations: s.enabledIntegrations.filter((entry) => entry !== id),
    })),
});
