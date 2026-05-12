/** Olgun Özoktaş geliştirdi · API Lab */
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { idbStorage, _resetMigratedCacheForTests } from "../idbStorage";

// Each test gets a unique key prefix so the on-disk fake IDB doesn't
// collide. Simpler than wiping the database between tests (deleteDatabase
// is queued asynchronously and the next openDB races against it on
// fake-indexeddb).
let testCounter = 0;
function nextKey(): string {
  testCounter += 1;
  return `test-${testCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

// fake-indexeddb auto-setup gives us a global `indexedDB`. We also need
// a localStorage-like global for the migration test. Vitest's node env
// doesn't ship one — add a small stub.
function withFakeLocalStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  const ls: Storage = {
    length: 0,
    key: (i) => Object.keys(store)[i] ?? null,
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
  (globalThis as { localStorage: Storage }).localStorage = ls;
  return store;
}

describe("idbStorage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    _resetMigratedCacheForTests();
  });

  it("setItem + getItem round-trip", async () => {
    withFakeLocalStorage();
    const k = nextKey();
    await idbStorage.setItem(k, "hello");
    const got = await idbStorage.getItem(k);
    expect(got).toBe("hello");
  });

  it("getItem returns null for missing keys", async () => {
    withFakeLocalStorage();
    const got = await idbStorage.getItem(nextKey());
    expect(got).toBe(null);
  });

  it("removeItem deletes the entry", async () => {
    withFakeLocalStorage();
    const k = nextKey();
    await idbStorage.setItem(k, "x");
    await idbStorage.removeItem(k);
    expect(await idbStorage.getItem(k)).toBe(null);
  });

  it("handles a large 1 MB string (past localStorage's typical headroom)", async () => {
    withFakeLocalStorage();
    const big = "x".repeat(1024 * 1024);
    const k = nextKey();
    await idbStorage.setItem(k, big);
    const got = await idbStorage.getItem(k);
    expect(got?.length).toBe(big.length);
    expect(got?.[0]).toBe("x");
  });

  describe("migration from localStorage", () => {
    it("copies a legacy entry into IDB on first read", async () => {
      const k = nextKey();
      const legacy = withFakeLocalStorage({ [k]: '{"foo":1}' });
      const got = await idbStorage.getItem(k);
      expect(got).toBe('{"foo":1}');
      // Legacy entry cleared on host
      expect(legacy[k]).toBeUndefined();
      // Subsequent reads come from IDB without re-touching localStorage
      const again = await idbStorage.getItem(k);
      expect(again).toBe('{"foo":1}');
    });

    it("does not migrate when IDB already has a value", async () => {
      const k = nextKey();
      withFakeLocalStorage({ [k]: '"legacy"' });
      // Pre-seed IDB. After this, the migration guard memoizes "already
      // migrated" for this key, so we expect IDB to win.
      await idbStorage.setItem(k, '"fresh"');
      const got = await idbStorage.getItem(k);
      expect(got).toBe('"fresh"');
    });

    it("survives a missing localStorage (null-origin / privacy)", async () => {
      // @ts-expect-error - test rig
      globalThis.localStorage = undefined;
      const got = await idbStorage.getItem(nextKey());
      expect(got).toBe(null);
    });
  });
});
