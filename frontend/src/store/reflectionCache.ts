// Standalone Zustand store for the gRPC reflection cache. Kept separate
// from the main `useStore` (which is already past the 400-LOC cap) and
// not persisted — the cache is intentionally in-memory only so users
// don't browse stale services across app restarts.

import { create } from "zustand";
import type { GrpcReflectService } from "../lib/bridge";
import { isStale, type ReflectionCacheEntry } from "../lib/reflectionCache";

export { REFLECTION_CACHE_TTL_MS, type ReflectionCacheEntry } from "../lib/reflectionCache";

type State = {
  entries: Map<string, ReflectionCacheEntry>;
};

type Actions = {
  // Returns null for both "no entry" and "entry is stale" — callers
  // never need to differentiate, both should trigger a fresh fetch.
  getCached: (target: string, now?: number) => ReflectionCacheEntry | null;
  setCached: (target: string, services: GrpcReflectService[], now?: number) => void;
  invalidate: (target: string) => void;
};

export const useReflectionCache = create<State & Actions>((set, get) => ({
  entries: new Map(),

  getCached: (target, now = Date.now()) => {
    const e = get().entries.get(target);
    if (!e) return null;
    if (isStale(e, now)) return null;
    return e;
  },

  setCached: (target, services, now = Date.now()) =>
    set((s) => {
      const next = new Map(s.entries);
      next.set(target, { fetchedAt: now, services });
      return { entries: next };
    }),

  invalidate: (target) =>
    set((s) => {
      if (!s.entries.has(target)) return {};
      const next = new Map(s.entries);
      next.delete(target);
      return { entries: next };
    }),
}));
