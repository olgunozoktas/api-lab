/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type {
  CollectionItem,
  ComposerTab,
  CurrentRequest,
  HistoryItem,
  RequestSnapshot,
} from "../lib/types";
import { emptyRequest } from "../lib/types";
import { displayTabName, uid } from "../lib/utils";
import { clone, nextOrder } from "./internal";
import { buildLoadedRequestState, composerTabFor, currentFromSnapshot } from "./loadRequest";
import type { Store, StoreMutators } from "./types";
import type { NewRequestKind } from "./collections";
import type { Sample } from "../lib/samples";

export type CurrentActions = {
  setCurrent: (patch: Partial<CurrentRequest>) => void;
  // Reset the active tab to a fresh blank request. Optional `kind`
  // pre-fills URL prefix (`wss://`, `sses://`, `grpcs://`) + isGraphql
  // so the right composer tab is active immediately. Defaults to
  // "http" when called with no args (back-compat with the keyboard
  // shortcut + sidebar's primary New-request button).
  resetCurrent: (kind?: NewRequestKind) => void;
  loadCollection: (c: CollectionItem) => void;
  loadHistoryItem: (h: HistoryItem) => void;
  // Load a built-in Sample into the active tab. Samples are bundle
  // constants (frontend/src/lib/samples.ts) — this never touches
  // collectionItems, so loading a sample doesn't persist it into
  // the user's saved tree.
  loadSample: (sample: Sample) => void;
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

  resetCurrent: (kind = "http") =>
    set((s) => {
      const fresh = emptyRequest();
      // Per-protocol pre-fills. HTTP keeps `emptyRequest()` defaults.
      if (kind === "graphql") {
        fresh.method = "POST";
      } else if (kind === "ws") {
        fresh.url = "wss://";
      } else if (kind === "sse") {
        fresh.url = "sses://";
      } else if (kind === "grpc") {
        fresh.url = "grpcs://";
      }
      const composerTab: ComposerTab = kind === "graphql" ? "graphql" : "params";
      return {
        current: fresh,
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId
            ? {
                ...t,
                request: clone(fresh),
                name: fresh.name,
                lastResponse: null,
                composerTab,
              }
            : t
        ),
        lastResponse: null,
        ui: { ...s.ui, composerTab },
      };
    }),

  loadCollection: (c) =>
    set((s) => {
      if (c.kind !== "request" || !c.request) return {};
      const r = c.request;
      // Shared loader state — `buildLoadedRequestState` resets the
      // response panel (Body tab, no stale response) for every loader.
      const ld = buildLoadedRequestState(
        currentFromSnapshot(r, c.id, c.name),
        composerTabFor(r.isGraphql)
      );
      // Per-request response memory — restore this request's last
      // response from the session cache; falls back to null (the
      // empty panel) when nothing is cached.
      const restored = c.id ? (s.responseCache[c.id] ?? null) : null;
      return {
        current: ld.current,
        lastResponse: restored,
        ui: { ...s.ui, composerTab: ld.composerTab, responseTab: ld.responseTab },
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId
            ? {
                ...t,
                name: c.name,
                request: clone(ld.current),
                composerTab: ld.composerTab,
                responseTab: ld.responseTab,
                lastResponse: restored,
              }
            : t
        ),
      };
    }),

  loadHistoryItem: (h) =>
    set((s) => {
      // History entries restore the request only, never the response —
      // the shared loader state clears it and returns to the Body tab.
      const ld = buildLoadedRequestState(
        currentFromSnapshot(h.request, null, s.current.name),
        composerTabFor(h.request.isGraphql)
      );
      return {
        current: ld.current,
        lastResponse: ld.lastResponse,
        ui: { ...s.ui, composerTab: ld.composerTab, responseTab: ld.responseTab },
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId
            ? {
                ...t,
                request: clone(ld.current),
                composerTab: ld.composerTab,
                responseTab: ld.responseTab,
                lastResponse: ld.lastResponse,
              }
            : t
        ),
      };
    }),

  loadSample: (sample) =>
    set((s) => {
      const nextCurrent: CurrentRequest = {
        id: null,
        name: "",
        method: sample.method ?? (sample.kind === "graphql" ? "POST" : "GET"),
        url: sample.url,
        params: [{ enabled: true, k: "", v: "" }],
        headers: (sample.headers ?? []).map((h) => ({ enabled: true, k: h.k, v: h.v })),
        auth: { type: "none" },
        body: sample.body ? { mode: "json", text: sample.body } : { mode: "none", text: "" },
        gql: { query: sample.gqlQuery ?? "", vars: "" },
      };
      // Ensure at least one empty header row for the editor UI.
      if (nextCurrent.headers.length === 0) {
        nextCurrent.headers = [{ enabled: true, k: "", v: "" }];
      }
      // Samples derive composerTab differently (a body-bearing sample
      // opens on the Body tab); the panel reset is the shared part.
      const composerTab: ComposerTab =
        sample.kind === "graphql" ? "graphql" : sample.body ? "body" : "params";
      const ld = buildLoadedRequestState(nextCurrent, composerTab);
      return {
        current: ld.current,
        lastResponse: ld.lastResponse,
        ui: { ...s.ui, composerTab: ld.composerTab, responseTab: ld.responseTab },
        tabs: s.tabs.map((t) =>
          t.id === s.activeTabId
            ? {
                ...t,
                request: clone(ld.current),
                composerTab: ld.composerTab,
                responseTab: ld.responseTab,
                lastResponse: ld.lastResponse,
              }
            : t
        ),
      };
    }),

  saveCurrent: () => {
    const cur = get().current;
    // When the user still has the placeholder name AND a URL is set,
    // commit the auto-derived `METHOD shortUrl` label on save — same
    // logic the tab strip + sidebar already display. They can rename
    // afterwards; the goal is "Save shouldn't leave you with three
    // 'New request' rows you can't tell apart".
    const derived = displayTabName({
      name: cur.name ?? "",
      method: cur.method,
      url: cur.url ?? "",
    });
    const name = (derived || "").trim() || "(adsız)";
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
    get().showToast("Kaydedildi", { severity: "success" });
  },
});
