/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  REFLECTION_CACHE_TTL_MS,
  formatCachedAge,
  isStale,
  type ReflectionCacheEntry,
} from "../reflectionCache";

const entry = (fetchedAt: number): ReflectionCacheEntry => ({
  fetchedAt,
  services: [],
});

describe("isStale", () => {
  it("is fresh when age is less than TTL", () => {
    expect(isStale(entry(0), REFLECTION_CACHE_TTL_MS - 1)).toBe(false);
  });

  it("is stale at the TTL boundary", () => {
    expect(isStale(entry(0), REFLECTION_CACHE_TTL_MS)).toBe(true);
  });

  it("is stale well past the TTL", () => {
    expect(isStale(entry(0), REFLECTION_CACHE_TTL_MS * 2)).toBe(true);
  });
});

describe("formatCachedAge", () => {
  it("returns seconds bucket for sub-minute ages", () => {
    expect(formatCachedAge(0)).toEqual({ unit: "seconds", count: 0 });
    expect(formatCachedAge(12_500)).toEqual({ unit: "seconds", count: 12 });
    expect(formatCachedAge(59_999)).toEqual({ unit: "seconds", count: 59 });
  });

  it("returns minutes bucket once age crosses 60s", () => {
    expect(formatCachedAge(60_000)).toEqual({ unit: "minutes", count: 1 });
    expect(formatCachedAge(4 * 60_000 + 30_000)).toEqual({ unit: "minutes", count: 4 });
  });

  it("clamps negative ages to zero seconds (clock skew defensive)", () => {
    expect(formatCachedAge(-5_000)).toEqual({ unit: "seconds", count: 0 });
  });
});
