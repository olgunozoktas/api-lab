/** Olgun Özoktaş geliştirdi · API Lab */
// Environment slice — the list of variable environments and which one
// is active. `envs` / `activeEnv` persist via the store's `partialize`;
// {{var}} resolution against the active env lives in `useActiveVars`
// (store/index.ts).
import type { StateCreator } from "zustand";
import type { Environment } from "../lib/types";
import type { Store, StoreMutators } from "./types";

export type EnvActions = {
  setEnvs: (envs: Environment[]) => void;
  setActiveEnv: (id: string) => void;
};

export const createEnvSlice: StateCreator<Store, StoreMutators, [], EnvActions> = (set) => ({
  setEnvs: (envs) => set({ envs }),
  setActiveEnv: (id) => set({ activeEnv: id }),
});
