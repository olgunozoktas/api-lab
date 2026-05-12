/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock idbStorage with an in-memory map. The real adapter swallows
// IDB errors in node tests (no global indexedDB) and would always
// return null; that hides regressions in our caller. The mock gives
// us a deterministic round-trip surface to assert against.
const memStore = new Map<string, string>();
vi.mock("../../store/idbStorage", () => ({
  idbStorage: {
    getItem: async (key: string) => memStore.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      memStore.set(key, value);
    },
    removeItem: async (key: string) => {
      memStore.delete(key);
    },
  },
}));

import { getLastSeen, markSeen, _internal } from "../changelog_seen";

describe("changelog_seen", () => {
  beforeEach(() => {
    memStore.clear();
  });

  it('returns "0.0.0" when no value stored', async () => {
    const seen = await getLastSeen();
    expect(seen).toBe("0.0.0");
  });

  it('returns "0.0.0" when stored value is empty', async () => {
    memStore.set(_internal.KEY, "");
    const seen = await getLastSeen();
    expect(seen).toBe("0.0.0");
  });

  it("round-trips a version through markSeen + getLastSeen", async () => {
    await markSeen("0.4.2");
    const seen = await getLastSeen();
    expect(seen).toBe("0.4.2");
    expect(memStore.get(_internal.KEY)).toBe("0.4.2");
  });

  it("subsequent markSeen overwrites the prior value", async () => {
    await markSeen("0.1.0");
    await markSeen("0.2.0");
    const seen = await getLastSeen();
    expect(seen).toBe("0.2.0");
  });

  it("uses a stable key under apilab namespace", () => {
    expect(_internal.KEY).toBe("apilab.changelog.lastSeen");
  });
});
