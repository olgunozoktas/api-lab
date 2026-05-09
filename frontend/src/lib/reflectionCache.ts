// Pure helpers for the per-target gRPC reflection cache. Logic lives
// here (not the Zustand store file) so unit tests don't need to spin
// up a store. The TTL constant is colocated for easy tuning.

import type { GrpcReflectService } from "./bridge";

export const REFLECTION_CACHE_TTL_MS = 5 * 60 * 1000;

export type ReflectionCacheEntry = {
  fetchedAt: number;
  services: GrpcReflectService[];
};

export function isStale(entry: ReflectionCacheEntry, now: number): boolean {
  return now - entry.fetchedAt >= REFLECTION_CACHE_TTL_MS;
}

// Bucketed age for the "(cached Xm ago)" badge. Returns the unit so
// the caller picks the i18n key — TR uses "sn"/"dk", EN uses "s"/"m".
export type CachedAge = { unit: "seconds" | "minutes"; count: number };

export function formatCachedAge(ageMs: number): CachedAge {
  const ageSec = Math.max(0, Math.floor(ageMs / 1000));
  if (ageSec < 60) return { unit: "seconds", count: ageSec };
  return { unit: "minutes", count: Math.floor(ageSec / 60) };
}
