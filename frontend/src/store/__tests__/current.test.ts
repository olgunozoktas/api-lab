/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { useStore } from "../index";
import type { CollectionItem, HistoryItem, RequestSnapshot } from "../../lib/types";
import type { Sample } from "../../lib/samples";

const REQ: RequestSnapshot = {
  method: "GET",
  url: "https://example.com",
  params: [{ enabled: true, k: "", v: "" }],
  headers: [{ enabled: true, k: "", v: "" }],
  auth: { type: "none" },
  body: { mode: "none", text: "" },
  gql: { query: "", vars: "" },
};

// Seed the active tab + top-level mirrors with a stale response and a
// non-Body response tab, so a reset by a loader is observable.
function seedStale(): string {
  const s = useStore.getState();
  const activeId = s.activeTabId;
  useStore.setState({
    lastResponse: { status: 200 } as never,
    ui: { ...s.ui, responseTab: "headers" },
    tabs: s.tabs.map((t) =>
      t.id === activeId
        ? { ...t, lastResponse: { status: 200 } as never, responseTab: "headers" }
        : t
    ),
  });
  return activeId;
}

function activeTab(id: string) {
  return useStore.getState().tabs.find((t) => t.id === id)!;
}

// Assert both the top-level mirrors AND the active tab record are reset.
function expectPanelReset(id: string) {
  const st = useStore.getState();
  expect(st.lastResponse).toBeNull();
  expect(st.ui.responseTab).toBe("body");
  expect(activeTab(id).lastResponse).toBeNull();
  expect(activeTab(id).responseTab).toBe("body");
}

describe("loadCollection resets the response panel", () => {
  it("clears the stale response and returns to the Body tab", () => {
    const id = seedStale();
    const item: CollectionItem = {
      id: "saved-1",
      parentId: null,
      kind: "request",
      name: "Saved request",
      order: 0,
      request: REQ,
    };
    useStore.getState().loadCollection(item);
    expectPanelReset(id);
  });

  it("is a no-op for a folder item (no request payload)", () => {
    seedStale();
    const folder: CollectionItem = {
      id: "f1",
      parentId: null,
      kind: "folder",
      name: "Folder",
      order: 0,
    };
    useStore.getState().loadCollection(folder);
    // Guard clause returns early — stale state is left untouched.
    expect(useStore.getState().ui.responseTab).toBe("headers");
  });
});

describe("loadHistoryItem resets the response panel", () => {
  it("clears the stale response and returns to the Body tab", () => {
    const id = seedStale();
    const h = {
      id: "h1",
      ts: Date.now(),
      request: { ...REQ },
      response: { status: 200, statusText: "OK", headers: [], sizeBytes: 0, elapsedMs: 1 },
    } as unknown as HistoryItem;
    useStore.getState().loadHistoryItem(h);
    expectPanelReset(id);
  });
});

describe("loadSample resets the response panel", () => {
  it("clears the stale response and returns to the Body tab", () => {
    const id = seedStale();
    const sample = {
      id: "sample-1",
      kind: "http",
      url: "https://example.com",
    } as unknown as Sample;
    useStore.getState().loadSample(sample);
    expectPanelReset(id);
  });
});
