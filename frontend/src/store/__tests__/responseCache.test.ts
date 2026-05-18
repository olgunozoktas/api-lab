/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { useStore } from "../index";
import { putBounded, RESPONSE_CACHE_CAP } from "../responseCache";
import type { CollectionItem, RequestSnapshot, ResponseSnapshot } from "../../lib/types";

// A distinguishable fake response — `tag` lets tests assert identity.
function resp(tag: string): ResponseSnapshot {
  return { status: 200, tag } as unknown as ResponseSnapshot;
}

describe("putBounded", () => {
  it("stores and returns a value under its key", () => {
    const out = putBounded<number>({}, "a", 1, 5);
    expect(out).toEqual({ a: 1 });
  });

  it("does not mutate the input record", () => {
    const input = { a: 1 };
    putBounded(input, "b", 2, 5);
    expect(input).toEqual({ a: 1 });
  });

  it("overwrites an existing key in place", () => {
    const out = putBounded({ a: 1, b: 2 }, "a", 9, 5);
    expect(out.a).toBe(9);
    expect(out.b).toBe(2);
  });

  it("evicts the oldest entry once over capacity", () => {
    let c: Record<string, number> = {};
    for (const k of ["a", "b", "c"]) c = putBounded(c, k, 0, 2);
    // "a" was oldest — evicted; "b" and "c" remain.
    expect(Object.keys(c)).toEqual(["b", "c"]);
  });

  it("keeps exactly `cap` entries at the boundary", () => {
    let c: Record<string, number> = {};
    for (const k of ["a", "b", "c"]) c = putBounded(c, k, 0, 3);
    expect(Object.keys(c)).toEqual(["a", "b", "c"]);
  });

  it("re-writing an old key rescues it from eviction (MRU)", () => {
    let c: Record<string, number> = {};
    c = putBounded(c, "a", 1, 2);
    c = putBounded(c, "b", 2, 2);
    c = putBounded(c, "a", 3, 2); // touch "a" → now MRU
    c = putBounded(c, "d", 4, 2); // evicts the oldest, which is now "b"
    expect(Object.keys(c).sort()).toEqual(["a", "d"]);
    expect(c.a).toBe(3);
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
  it("caches the response when the active request has a saved id", () => {
    const s = useStore.getState();
    useStore.setState({ current: { ...s.current, id: "saved-A" }, responseCache: {} });
    const r = resp("A1");
    useStore.getState().setLastResponse(r);
    expect(useStore.getState().responseCache["saved-A"]).toBe(r);
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
    const cached = resp("restored");
    useStore.setState({ responseCache: { "saved-C": cached } });
    useStore.getState().loadCollection(savedItem("saved-C"));
    const st = useStore.getState();
    expect(st.lastResponse).toBe(cached);
    const active = st.tabs.find((t) => t.id === st.activeTabId)!;
    expect(active.lastResponse).toBe(cached);
  });

  it("shows an empty panel for a request with no cached response", () => {
    useStore.setState({ responseCache: {} });
    useStore.getState().loadCollection(savedItem("never-sent"));
    expect(useStore.getState().lastResponse).toBeNull();
  });

  it("loadCollectionInNewTab also restores the cached response", () => {
    const cached = resp("new-tab-restore");
    useStore.setState({ responseCache: { "saved-D": cached } });
    useStore.getState().loadCollectionInNewTab(savedItem("saved-D"));
    const st = useStore.getState();
    expect(st.lastResponse).toBe(cached);
    const active = st.tabs.find((t) => t.id === st.activeTabId)!;
    expect(active.lastResponse).toBe(cached);
  });
});

describe("RESPONSE_CACHE_CAP", () => {
  it("is a sane positive bound", () => {
    expect(RESPONSE_CACHE_CAP).toBeGreaterThan(0);
    expect(RESPONSE_CACHE_CAP).toBeLessThan(1000);
  });
});
