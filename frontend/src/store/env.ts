/** Olgun Özoktaş geliştirdi · API Lab */
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
