/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { useStore } from "../index";
import { buildLoadedRequestState, composerTabFor, currentFromSnapshot } from "../loadRequest";
import type { CollectionItem, HistoryItem, RequestSnapshot } from "../../lib/types";

const REQ: RequestSnapshot = {
  method: "POST",
  url: "https://example.com/api",
  params: [{ enabled: true, k: "q", v: "1" }],
  headers: [{ enabled: true, k: "X-Test", v: "y" }],
  auth: { type: "bearer", token: "" },
  body: { mode: "json", text: "{}" },
  gql: { query: "", vars: "" },
};

describe("currentFromSnapshot", () => {
  it("maps every field and stamps id + name", () => {
    const cur = currentFromSnapshot(REQ, "id-1", "My request");
    expect(cur.id).toBe("id-1");
    expect(cur.name).toBe("My request");
    expect(cur.method).toBe("POST");
    expect(cur.url).toBe("https://example.com/api");
    expect(cur.params).toEqual(REQ.params);
    expect(cur.headers).toEqual(REQ.headers);
  });

  it("deep-clones — mutating the result never touches the source", () => {
    const cur = currentFromSnapshot(REQ, null, "x");
    cur.params[0].v = "mutated";
    expect(REQ.params[0].v).toBe("1");
  });

  it("fills defaults for a partial snapshot (old persisted data)", () => {
    const cur = currentFromSnapshot({} as RequestSnapshot, null, "");
    expect(cur.method).toBe("GET");
    expect(cur.url).toBe("");
    expect(cur.params).toEqual([{ enabled: true, k: "", v: "" }]);
    expect(cur.headers).toEqual([{ enabled: true, k: "", v: "" }]);
    expect(cur.auth).toEqual({ type: "none" });
    expect(cur.body).toEqual({ mode: "none", text: "" });
    expect(cur.gql).toEqual({ query: "", vars: "" });
  });
});

describe("composerTabFor", () => {
  it("returns graphql for a GraphQL request", () => {
    expect(composerTabFor(true)).toBe("graphql");
  });
  it("returns params otherwise", () => {
    expect(composerTabFor(false)).toBe("params");
    expect(composerTabFor(undefined)).toBe("params");
  });
});

describe("buildLoadedRequestState", () => {
  it("always resets the response panel — Body tab, no response", () => {
    const cur = currentFromSnapshot(REQ, "id", "n");
    const ld = buildLoadedRequestState(cur, "graphql");
    expect(ld.responseTab).toBe("body");
    expect(ld.lastResponse).toBeNull();
    expect(ld.composerTab).toBe("graphql");
    expect(ld.current).toBe(cur);
  });
});

// Item 2 — regression guard: the in-place and new-tab loader pairs
// must produce the same response-panel state, or a future drift (the
// bug this module exists to prevent) fails CI.
function seedStale(): void {
  const s = useStore.getState();
  useStore.setState({
    lastResponse: { status: 500 } as never,
    ui: { ...s.ui, responseTab: "headers" },
    tabs: s.tabs.map((t) =>
      t.id === s.activeTabId
        ? { ...t, lastResponse: { status: 500 } as never, responseTab: "headers" }
        : t
    ),
  });
}

function panelState() {
  const s = useStore.getState();
  const active = s.tabs.find((t) => t.id === s.activeTabId)!;
  return {
    topResponse: s.lastResponse,
    topTab: s.ui.responseTab,
    composerTab: s.ui.composerTab,
    tabResponse: active.lastResponse,
    tabTab: active.responseTab,
  };
}

const COLLECTION_ITEM: CollectionItem = {
  id: "saved-x",
  parentId: null,
  kind: "request",
  name: "Saved",
  order: 0,
  request: { ...REQ, isGraphql: true },
};

const HISTORY_ITEM = {
  id: "h-x",
  ts: Date.now(),
  request: { ...REQ },
  response: { status: 200, statusText: "OK", headers: [], sizeBytes: 0, elapsedMs: 1 },
} as unknown as HistoryItem;

describe("loader parity — in-place vs new-tab", () => {
  it("loadCollection and loadCollectionInNewTab reset the panel identically", () => {
    seedStale();
    useStore.getState().loadCollection(COLLECTION_ITEM);
    const inPlace = panelState();

    seedStale();
    useStore.getState().loadCollectionInNewTab(COLLECTION_ITEM);
    const newTab = panelState();

    for (const st of [inPlace, newTab]) {
      expect(st.topResponse).toBeNull();
      expect(st.topTab).toBe("body");
      expect(st.tabResponse).toBeNull();
      expect(st.tabTab).toBe("body");
    }
    expect(inPlace.composerTab).toBe(newTab.composerTab);
  });

  it("loadHistoryItem and openHistoryItemInNewTab reset the panel identically", () => {
    seedStale();
    useStore.getState().loadHistoryItem(HISTORY_ITEM);
    const inPlace = panelState();

    seedStale();
    useStore.getState().openHistoryItemInNewTab(HISTORY_ITEM);
    const newTab = panelState();

    for (const st of [inPlace, newTab]) {
      expect(st.topResponse).toBeNull();
      expect(st.topTab).toBe("body");
      expect(st.tabResponse).toBeNull();
      expect(st.tabTab).toBe("body");
    }
    expect(inPlace.composerTab).toBe(newTab.composerTab);
  });
});
