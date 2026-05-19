/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { useStore } from "../index";
import {
  putBounded,
  putBoundedBytes,
  cachedResponseBytes,
  pruneStale,
  RESPONSE_CACHE_CAP,
  type CachedResponse,
} from "../responseCache";
import type { CollectionItem, RequestSnapshot, ResponseSnapshot } from "../../lib/types";

// A distinguishable fake response — `tag` lets tests assert identity.
// `body` is real so `cachedResponseBytes` (called on every cache
// write) has a string to measure.
function resp(tag: string): ResponseSnapshot {
  return { status: 200, body: "", tag } as unknown as ResponseSnapshot;
}

// Wrap a fake response as it lives in the cache.
function cached(tag: string): CachedResponse {
  return { response: resp(tag), cachedAt: Date.now() };
}

describe("putBounded", () => {
  it("stores and returns a value under its key", () => {
    expect(putBounded<number>({}, "a", 1, 5)).toEqual({ a: 1 });
  });

  it("does not mutate the input record", () => {
    const input = { a: 1 };
    putBounded(input, "b", 2, 5);
    expect(input).toEqual({ a: 1 });
  });

  it("evicts the oldest entry once over capacity", () => {
    let c: Record<string, number> = {};
    for (const k of ["a", "b", "c"]) c = putBounded(c, k, 0, 2);
    expect(Object.keys(c)).toEqual(["b", "c"]);
  });

  it("re-writing an old key rescues it from eviction (MRU)", () => {
    let c: Record<string, number> = {};
    c = putBounded(c, "a", 1, 2);
    c = putBounded(c, "b", 2, 2);
    c = putBounded(c, "a", 3, 2); // touch "a" → now MRU
    c = putBounded(c, "d", 4, 2); // evicts "b", the now-oldest
    expect(Object.keys(c).sort()).toEqual(["a", "d"]);
  });
});

describe("putBoundedBytes", () => {
  const opts = { cap: 100, maxEntryBytes: 50, maxTotalBytes: 100, sizeOf: (n: number) => n };

  it("rejects a value over the per-entry ceiling, returning the cache untouched", () => {
    const before = { a: 10 };
    const after = putBoundedBytes(before, "big", 999, opts);
    expect(after).toBe(before);
  });

  it("evicts oldest entries until under the total byte budget", () => {
    let c: Record<string, number> = {};
    c = putBoundedBytes(c, "a", 40, opts);
    c = putBoundedBytes(c, "b", 40, opts);
    c = putBoundedBytes(c, "c", 40, opts); // 120 bytes > 100 → "a" evicted
    expect(Object.keys(c)).toEqual(["b", "c"]);
  });

  it("still honors the entry-count cap", () => {
    const small = { cap: 2, maxEntryBytes: 50, maxTotalBytes: 9999, sizeOf: (n: number) => n };
    let c: Record<string, number> = {};
    for (const k of ["a", "b", "c"]) c = putBoundedBytes(c, k, 1, small);
    expect(Object.keys(c)).toEqual(["b", "c"]);
  });

  it("evicts only as many oldest entries as the byte budget needs", () => {
    let c: Record<string, number> = { a: 30, b: 30 };
    c = putBoundedBytes(c, "c", 50, opts); // 110 > 100 → drop "a", {b,c}=80 fits
    expect(Object.keys(c)).toEqual(["b", "c"]);
  });
});

describe("cachedResponseBytes", () => {
  it("sums the text body and the base64 channel", () => {
    const c: CachedResponse = {
      response: { body: "hello", bodyBase64: "QUJD" } as ResponseSnapshot,
      cachedAt: 0,
    };
    expect(cachedResponseBytes(c)).toBe(9);
  });

  it("treats a missing base64 channel as zero", () => {
    const c: CachedResponse = { response: { body: "abc" } as ResponseSnapshot, cachedAt: 0 };
    expect(cachedResponseBytes(c)).toBe(3);
  });
});

describe("pruneStale", () => {
  const now = 1_000_000_000;
  const ttl = 1000;

  it("drops entries older than the TTL and keeps fresh ones", () => {
    const cache: Record<string, CachedResponse> = {
      fresh: { response: resp("f"), cachedAt: now - 500 },
      stale: { response: resp("s"), cachedAt: now - 5000 },
    };
    expect(Object.keys(pruneStale(cache, ttl, now))).toEqual(["fresh"]);
  });

  it("keeps an entry exactly at the TTL boundary", () => {
    const cache: Record<string, CachedResponse> = {
      edge: { response: resp("e"), cachedAt: now - ttl },
    };
    expect(Object.keys(pruneStale(cache, ttl, now))).toEqual(["edge"]);
  });

  it("does not mutate the input", () => {
    const cache: Record<string, CachedResponse> = {
      stale: { response: resp("s"), cachedAt: now - 5000 },
    };
    pruneStale(cache, ttl, now);
    expect(Object.keys(cache)).toEqual(["stale"]);
  });
});

const REQ: RequestSnapshot = {
  method: "GET",
  url: "https://example.com",
  params: [{ enabled: true, k: "", v: "" }],
  headers: [{ enabled: true, k: "", v: "" }],
  auth: { type: "none" },
  body: { mode: "none", text: "" },
  gql: { query: "", vars: "" },
};

function savedItem(id: string): CollectionItem {
  return { id, parentId: null, kind: "request", name: `req ${id}`, order: 0, request: REQ };
}

describe("setLastResponse — caching against the saved request id", () => {
  it("caches the response (wrapped) when the active request has a saved id", () => {
    const s = useStore.getState();
    useStore.setState({ current: { ...s.current, id: "saved-A" }, responseCache: {} });
    const r = resp("A1");
    useStore.getState().setLastResponse(r);
    expect(useStore.getState().responseCache["saved-A"].response).toBe(r);
  });

  it("does not cache when the active request is unsaved (id null)", () => {
    const s = useStore.getState();
    useStore.setState({ current: { ...s.current, id: null }, responseCache: {} });
    useStore.getState().setLastResponse(resp("U1"));
    expect(useStore.getState().responseCache).toEqual({});
  });

  it("does not cache a cleared (null) response", () => {
    const s = useStore.getState();
    useStore.setState({ current: { ...s.current, id: "saved-B" }, responseCache: {} });
    useStore.getState().setLastResponse(null);
    expect(useStore.getState().responseCache).toEqual({});
  });
});

describe("loadCollection — restoring the cached response", () => {
  it("restores the request's last response from the cache", () => {
    const entry = cached("restored");
    useStore.setState({ responseCache: { "saved-C": entry } });
    useStore.getState().loadCollection(savedItem("saved-C"));
    expect(useStore.getState().lastResponse).toBe(entry.response);
  });

  it("shows an empty panel for a request with no cached response", () => {
    useStore.setState({ responseCache: {} });
    useStore.getState().loadCollection(savedItem("never-sent"));
    expect(useStore.getState().lastResponse).toBeNull();
  });

  it("loadCollectionInNewTab also restores the cached response", () => {
    const entry = cached("new-tab-restore");
    useStore.setState({ responseCache: { "saved-D": entry } });
    useStore.getState().loadCollectionInNewTab(savedItem("saved-D"));
    const st = useStore.getState();
    expect(st.lastResponse).toBe(entry.response);
    const active = st.tabs.find((t) => t.id === st.activeTabId)!;
    expect(active.lastResponse).toBe(entry.response);
  });
});

describe("RESPONSE_CACHE_CAP", () => {
  it("is a sane positive bound", () => {
    expect(RESPONSE_CACHE_CAP).toBeGreaterThan(0);
    expect(RESPONSE_CACHE_CAP).toBeLessThan(1000);
  });
});
