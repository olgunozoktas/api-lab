import type { StateCreator } from "zustand";
import type {
  CollectionItem,
  ComposerTab,
  CurrentRequest,
  HistoryItem,
  RequestSnapshot,
} from "../lib/types";
import { emptyRequest } from "../lib/types";
import { uid } from "../lib/utils";
import { clone, nextOrder } from "./internal";
import type { Store, StoreMutators } from "./types";

export type CurrentActions = {
  setCurrent: (patch: Partial<CurrentRequest>) => void;
  resetCurrent: () => void;
  loadCollection: (c: CollectionItem) => void;
  loadHistoryItem: (h: HistoryItem) => void;
  saveCurrent: () => void;
};

// Active-tab mutations — write to mirrors AND update the tab record
// so the persisted snapshot stays consistent after a reload.
export const createCurrentSlice: StateCreator<Store, StoreMutators, [], CurrentActions> = (
  set,
  get
) => ({
  setCurrent: (patch) =>
    set((s) => {
      const nextCurrent = { ...s.current, ...patch };
      return {
        current: nextCurrent,
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId
            ? {
                ...t,
                request: clone(nextCurrent),
                name: nextCurrent.name?.trim() || t.name,
              }
            : t
        ),
      };
    }),

  resetCurrent: () =>
    set((s) => {
      const fresh = emptyRequest();
      return {
        current: fresh,
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId
            ? {
                ...t,
                request: clone(fresh),
                name: fresh.name,
                lastResponse: null,
                composerTab: "params",
              }
            : t
        ),
        lastResponse: null,
        ui: { ...s.ui, composerTab: "params" },
      };
    }),

  loadCollection: (c) =>
    set((s) => {
      if (c.kind !== "request" || !c.request) return {};
      const r = c.request;
      const nextCurrent: CurrentRequest = {
        id: c.id,
        name: c.name,
        method: r.method ?? "GET",
        url: r.url ?? "",
        params: clone(r.params ?? [{ enabled: true, k: "", v: "" }]),
        headers: clone(r.headers ?? [{ enabled: true, k: "", v: "" }]),
        auth: clone(r.auth ?? { type: "none" }),
        body: clone(r.body ?? { mode: "none", text: "" }),
        gql: clone(r.gql ?? { query: "", vars: "" }),
      };
      const composerTab: ComposerTab = r.isGraphql ? "graphql" : "params";
      return {
        current: nextCurrent,
        ui: { ...s.ui, composerTab },
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId
            ? { ...t, name: c.name, request: clone(nextCurrent), composerTab }
            : t
        ),
      };
    }),

  loadHistoryItem: (h) =>
    set((s) => {
      const nextCurrent: CurrentRequest = {
        id: null,
        name: s.current.name,
        method: h.request.method,
        url: h.request.url,
        params: clone(h.request.params),
        headers: clone(h.request.headers),
        auth: clone(h.request.auth),
        body: clone(h.request.body),
        gql: clone(h.request.gql),
      };
      const composerTab: ComposerTab = h.request.isGraphql ? "graphql" : "params";
      return {
        current: nextCurrent,
        ui: { ...s.ui, composerTab },
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId ? { ...t, request: clone(nextCurrent), composerTab } : t
        ),
      };
    }),

  saveCurrent: () => {
    const cur = get().current;
    const name = cur.name?.trim() || "(adsız)";
    const isGraphql = get().ui.composerTab === "graphql";
    const snap: RequestSnapshot = {
      method: cur.method,
      url: cur.url,
      params: clone(cur.params),
      headers: clone(cur.headers),
      auth: clone(cur.auth),
      body: clone(cur.body),
      gql: clone(cur.gql),
      isGraphql,
    };
    const items = get().collectionItems.slice();
    if (cur.id) {
      // Update existing item in-place — preserve its parentId/order.
      const i = items.findIndex((c) => c.id === cur.id);
      if (i >= 0) items[i] = { ...items[i], name, kind: "request", request: snap };
    } else {
      const id = uid();
      items.push({
        id,
        parentId: null,
        kind: "request",
        order: nextOrder(items, null),
        name,
        request: snap,
      });
      set((s) => ({
        current: { ...cur, id, name },
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId ? { ...t, name, request: { ...t.request, id, name } } : t
        ),
      }));
    }
    set({ collectionItems: items });
    get().showToast("Kaydedildi");
  },
});
