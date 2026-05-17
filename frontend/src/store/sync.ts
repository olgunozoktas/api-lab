/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type { SyncConfig, SyncStatus } from "../lib/types";
import type { Store, StoreMutators } from "./types";

// Git-based collection sync (Phase K). `syncConfig` (repo URL +
// enabled flag) persists; `syncStatus` is runtime-only — it reflects
// the current session's last sync attempt and resets on relaunch.
export type SyncActions = {
  setSyncConfig: (patch: Partial<SyncConfig>) => void;
  setSyncStatus: (patch: Partial<SyncStatus>) => void;
};

export const createSyncSlice: StateCreator<Store, StoreMutators, [], SyncActions> = (set) => ({
  setSyncConfig: (patch) => set((s) => ({ syncConfig: { ...s.syncConfig, ...patch } })),
  setSyncStatus: (patch) => set((s) => ({ syncStatus: { ...s.syncStatus, ...patch } })),
});
