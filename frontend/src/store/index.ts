import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CollectionItem,
  Environment,
  HistoryItem,
  CurrentRequest,
  ResponseSnapshot,
  UiState,
  RequestSnapshot,
  OpenTab,
  ComposerTab,
  ResponseTab,
  RequestDefaults,
} from "../lib/types";
import { emptyRequest, emptyTab } from "../lib/types";
import { uid } from "../lib/utils";
import type { Locale } from "../lib/i18n";
import {
  clone,
  buildInitialState,
  snapshotActiveIntoTab,
  nextActiveAfterClose,
  migrateV1toV2,
  migrateV2toV3,
  descendantIds,
  nextOrder,
  type CoreState,
} from "./internal";
import { idbStorage } from "./idbStorage";

// Multi-request workspace store. `tabs[]` is the source of truth; each tab
// carries its own request/lastResponse/composerTab/responseTab. The
// top-level `current`/`lastResponse`/`ui.composerTab`/`ui.responseTab`
// fields are MIRRORED to the active tab so leaf components stay shape-
// agnostic. Mirrors are maintained on every active-tab mutation only.
type State = CoreState;

type Actions = {
  setCurrent: (patch: Partial<CurrentRequest>) => void;
  resetCurrent: () => void;
  loadCollection: (c: CollectionItem) => void;
  loadHistoryItem: (h: HistoryItem) => void;
  saveCurrent: () => void;
  deleteCollectionItem: (id: string) => void;
  addFolder: (parentId: string | null, name: string) => string;
  renameCollectionItem: (id: string, name: string) => void;
  toggleFolder: (id: string) => void;
  moveCollectionItem: (id: string, newParentId: string | null) => void;
  setActiveEnv: (id: string) => void;
  setUi: (patch: Partial<UiState>) => void;
  setEnvs: (envs: Environment[]) => void;
  setLocale: (l: Locale) => void;
  setDefaults: (patch: Partial<RequestDefaults>) => void;
  pushHistory: (
    snap: RequestSnapshot,
    status: number,
    sizeBytes: number,
    elapsedMs: number
  ) => void;
  clearHistory: () => void;
  setLastResponse: (r: ResponseSnapshot | null) => void;
  showToast: (msg: string) => void;

  // Tab actions
  newTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  reorderTabs: (fromIdx: number, toIdx: number) => void;
  loadCollectionInNewTab: (c: CollectionItem) => void;
};

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),

      // -------------------------------------------------------------------
      // Active-tab mutations — write to mirrors AND update the tab record
      // so the persisted snapshot stays consistent after a reload.
      // -------------------------------------------------------------------
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

      deleteCollectionItem: (id) =>
        set((s) => {
          // Recursive: collect all descendants (folders take their kids
          // with them) and purge in one pass.
          const toRemove = new Set<string>([id, ...descendantIds(s.collectionItems, id)]);
          const items = s.collectionItems.filter((c) => !toRemove.has(c.id));
          const expanded = { ...s.collectionsExpanded };
          for (const k of toRemove) delete expanded[k];
          // If any open tab pointed at a removed request, drop the
          // collection link so the tab still works (just unsaved).
          const tabs = s.tabs.map((t) =>
            t.request.id && toRemove.has(t.request.id)
              ? { ...t, request: { ...t.request, id: null } }
              : t
          );
          const current =
            s.current.id && toRemove.has(s.current.id) ? { ...s.current, id: null } : s.current;
          return { collectionItems: items, collectionsExpanded: expanded, tabs, current };
        }),

      addFolder: (parentId, name) => {
        const id = uid();
        const trimmed = name.trim() || "Yeni klasör";
        set((s) => ({
          collectionItems: [
            ...s.collectionItems,
            {
              id,
              parentId,
              kind: "folder",
              order: nextOrder(s.collectionItems, parentId),
              name: trimmed,
            },
          ],
          collectionsExpanded: { ...s.collectionsExpanded, [id]: true },
        }));
        return id;
      },

      renameCollectionItem: (id, name) =>
        set((s) => {
          const trimmed = name.trim();
          if (!trimmed) return {};
          return {
            collectionItems: s.collectionItems.map((c) =>
              c.id === id ? { ...c, name: trimmed } : c
            ),
            // Mirror rename into open tabs that reference this request.
            tabs: s.tabs.map((t) =>
              t.request.id === id
                ? { ...t, name: trimmed, request: { ...t.request, name: trimmed } }
                : t
            ),
            current: s.current.id === id ? { ...s.current, name: trimmed } : s.current,
          };
        }),

      toggleFolder: (id) =>
        set((s) => ({
          collectionsExpanded: {
            ...s.collectionsExpanded,
            [id]: !s.collectionsExpanded[id],
          },
        })),

      moveCollectionItem: (id, newParentId) =>
        set((s) => {
          // Refuse to move a folder into one of its own descendants
          // (would create a cycle).
          if (newParentId !== null) {
            const item = s.collectionItems.find((c) => c.id === id);
            if (item?.kind === "folder") {
              const cycle = descendantIds(s.collectionItems, id);
              if (cycle.includes(newParentId) || newParentId === id) return {};
            }
          }
          const items = s.collectionItems.map((c) =>
            c.id === id
              ? { ...c, parentId: newParentId, order: nextOrder(s.collectionItems, newParentId) }
              : c
          );
          // Auto-expand the destination folder so the moved item is visible.
          const expanded =
            newParentId !== null
              ? { ...s.collectionsExpanded, [newParentId]: true }
              : s.collectionsExpanded;
          return { collectionItems: items, collectionsExpanded: expanded };
        }),

      setActiveEnv: (id) => set({ activeEnv: id }),

      setUi: (patch) =>
        set((s) => {
          const nextUi = { ...s.ui, ...patch };
          const tabPatch: Partial<OpenTab> = {};
          if (patch.composerTab !== undefined) tabPatch.composerTab = patch.composerTab;
          if (patch.responseTab !== undefined) tabPatch.responseTab = patch.responseTab;
          if (Object.keys(tabPatch).length === 0) return { ui: nextUi };
          return {
            ui: nextUi,
            tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, ...tabPatch } : t)),
          };
        }),

      setEnvs: (envs) => set({ envs }),
      setLocale: (locale) => set({ locale }),
      setDefaults: (patch) =>
        set((s) => ({
          defaults: { ...s.defaults, ...patch },
        })),

      pushHistory: (snap, status, sizeBytes, elapsedMs) =>
        set((s) => {
          const item: HistoryItem = {
            id: uid(),
            ts: Date.now(),
            request: snap,
            response: { status, sizeBytes, elapsedMs },
          };
          const next = [item, ...s.history];
          if (next.length > 200) next.length = 200;
          return { history: next };
        }),

      clearHistory: () => set({ history: [] }),

      setLastResponse: (r) =>
        set((s) => ({
          lastResponse: r,
          tabs: s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, lastResponse: r } : t)),
        })),

      showToast: (msg) => set({ toast: { msg, ts: Date.now() } }),

      // -------------------------------------------------------------------
      // Tab actions
      // -------------------------------------------------------------------
      newTab: () =>
        set((s) => {
          const tabs = snapshotActiveIntoTab(s);
          const fresh = emptyTab(uid());
          return {
            tabs: [...tabs, fresh],
            activeTabId: fresh.id,
            current: clone(fresh.request),
            lastResponse: fresh.lastResponse,
            ui: {
              ...s.ui,
              composerTab: fresh.composerTab,
              responseTab: fresh.responseTab,
            },
          };
        }),

      closeTab: (id) =>
        set((s) => {
          if (s.tabs.length === 1) {
            const fresh = emptyTab(uid());
            return {
              tabs: [fresh],
              activeTabId: fresh.id,
              current: clone(fresh.request),
              lastResponse: fresh.lastResponse,
              ui: {
                ...s.ui,
                composerTab: fresh.composerTab,
                responseTab: fresh.responseTab,
              },
            };
          }
          const filtered = s.tabs.filter((t) => t.id !== id);
          if (id === s.activeTabId) {
            const nextId = nextActiveAfterClose(s.tabs, id);
            const nextTab = filtered.find((t) => t.id === nextId) ?? filtered[0];
            return {
              tabs: filtered,
              activeTabId: nextTab.id,
              current: clone(nextTab.request),
              lastResponse: nextTab.lastResponse,
              ui: {
                ...s.ui,
                composerTab: nextTab.composerTab,
                responseTab: nextTab.responseTab,
              },
            };
          }
          return { tabs: filtered };
        }),

      setActiveTab: (id) =>
        set((s) => {
          if (id === s.activeTabId) return {};
          const tabs = snapshotActiveIntoTab(s);
          const target = tabs.find((t) => t.id === id);
          if (!target) return {};
          return {
            tabs,
            activeTabId: id,
            current: clone(target.request),
            lastResponse: target.lastResponse,
            ui: {
              ...s.ui,
              composerTab: target.composerTab,
              responseTab: target.responseTab,
            },
          };
        }),

      renameTab: (id, name) =>
        set((s) => {
          const trimmed = name.trim() || "Yeni istek";
          const tabs = s.tabs.map((t) => (t.id === id ? { ...t, name: trimmed } : t));
          if (id === s.activeTabId) {
            return { tabs, current: { ...s.current, name: trimmed } };
          }
          return { tabs };
        }),

      reorderTabs: (fromIdx, toIdx) =>
        set((s) => {
          if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return {};
          if (fromIdx >= s.tabs.length || toIdx >= s.tabs.length) return {};
          const next = s.tabs.slice();
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          return { tabs: next };
        }),

      loadCollectionInNewTab: (c) =>
        set((s) => {
          if (c.kind !== "request" || !c.request) return {};
          const r = c.request;
          const tabs = snapshotActiveIntoTab(s);
          const composerTab: ComposerTab = r.isGraphql ? "graphql" : "params";
          const responseTab: ResponseTab = "body";
          const fresh: OpenTab = {
            id: uid(),
            name: c.name,
            request: {
              id: c.id,
              name: c.name,
              method: r.method ?? "GET",
              url: r.url ?? "",
              params: clone(r.params ?? [{ enabled: true, k: "", v: "" }]),
              headers: clone(r.headers ?? [{ enabled: true, k: "", v: "" }]),
              auth: clone(r.auth ?? { type: "none" }),
              body: clone(r.body ?? { mode: "none", text: "" }),
              gql: clone(r.gql ?? { query: "", vars: "" }),
            },
            lastResponse: null,
            composerTab,
            responseTab,
          };
          return {
            tabs: [...tabs, fresh],
            activeTabId: fresh.id,
            current: clone(fresh.request),
            lastResponse: null,
            ui: { ...s.ui, composerTab, responseTab },
          };
        }),
    }),
    {
      name: "apilab.store.v1",
      version: 3,
      migrate: (persisted, fromVersion) => {
        let s: unknown = persisted;
        if (fromVersion < 2) s = migrateV1toV2(s);
        if (fromVersion < 3) s = migrateV2toV3(s);
        return s as State;
      },
      // IndexedDB-backed storage. Uncaps the 5 MB localStorage limit
      // and includes a one-shot migration on first read for users
      // upgrading from the localStorage-era persisted snapshot. See
      // store/idbStorage.ts for the migration logic.
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) =>
        ({
          collectionItems: s.collectionItems,
          collectionsExpanded: s.collectionsExpanded,
          envs: s.envs,
          activeEnv: s.activeEnv,
          history: s.history,
          tabs: s.tabs,
          activeTabId: s.activeTabId,
          ui: s.ui,
          locale: s.locale,
          defaults: s.defaults,
        }) as State,
    }
  )
);

// Helper hook for env vars resolution
export function useActiveVars(): Record<string, string> {
  return useStore((s) => s.envs.find((e) => e.id === s.activeEnv)?.vars ?? {});
}
