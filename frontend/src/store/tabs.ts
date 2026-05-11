import type { StateCreator } from "zustand";
import type { CollectionItem, ComposerTab, OpenTab, ResponseTab } from "../lib/types";
import { emptyTab } from "../lib/types";
import { uid } from "../lib/utils";
import { clone, nextActiveAfterClose, snapshotActiveIntoTab } from "./internal";
import type { Store, StoreMutators } from "./types";

export type TabsActions = {
  newTab: () => void;
  closeTab: (id: string) => void;
  // Right-click context-menu actions. `keepId` stays open, everything
  // else gets closed; same activation rule as closeTab (active stays
  // active if it survives, otherwise nearest neighbor wins).
  closeOtherTabs: (keepId: string) => void;
  closeTabsToRight: (fromId: string) => void;
  duplicateTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  reorderTabs: (fromIdx: number, toIdx: number) => void;
  loadCollectionInNewTab: (c: CollectionItem) => void;
};

export const createTabsSlice: StateCreator<Store, StoreMutators, [], TabsActions> = (set) => ({
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

  closeOtherTabs: (keepId) =>
    set((s) => {
      const keep = s.tabs.find((t) => t.id === keepId);
      if (!keep) return {};
      if (s.tabs.length === 1) return {};
      // Snapshot the kept tab's live mirror in case it's the active
      // one (otherwise unsaved edits in the active tab would lose
      // their mirror values).
      const snapshotted = snapshotActiveIntoTab(s);
      const survivor = snapshotted.find((t) => t.id === keepId) ?? keep;
      return {
        tabs: [survivor],
        activeTabId: survivor.id,
        current: clone(survivor.request),
        lastResponse: survivor.lastResponse,
        ui: {
          ...s.ui,
          composerTab: survivor.composerTab,
          responseTab: survivor.responseTab,
        },
      };
    }),

  closeTabsToRight: (fromId) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === fromId);
      if (idx < 0 || idx === s.tabs.length - 1) return {};
      const snapshotted = snapshotActiveIntoTab(s);
      const kept = snapshotted.slice(0, idx + 1);
      // If the active tab was in the closed range, fall back to the
      // anchor tab (fromId). Otherwise active survives — keep it.
      const activeStillOpen = kept.some((t) => t.id === s.activeTabId);
      const nextActive = activeStillOpen
        ? kept.find((t) => t.id === s.activeTabId)!
        : kept[kept.length - 1];
      return {
        tabs: kept,
        activeTabId: nextActive.id,
        current: clone(nextActive.request),
        lastResponse: nextActive.lastResponse,
        ui: {
          ...s.ui,
          composerTab: nextActive.composerTab,
          responseTab: nextActive.responseTab,
        },
      };
    }),

  duplicateTab: (id) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      if (idx < 0) return {};
      // Snapshot live mirror first so an in-flight active edit
      // duplicates with the edited content rather than the persisted
      // tab snapshot (which can lag behind by an active-mutation).
      const snapshotted = snapshotActiveIntoTab(s);
      const source = snapshotted[idx];
      const dup: OpenTab = {
        ...source,
        id: uid(),
        request: clone(source.request),
        lastResponse: source.lastResponse ? clone(source.lastResponse) : null,
      };
      const next = [...snapshotted.slice(0, idx + 1), dup, ...snapshotted.slice(idx + 1)];
      return {
        tabs: next,
        activeTabId: dup.id,
        current: clone(dup.request),
        lastResponse: dup.lastResponse,
        ui: {
          ...s.ui,
          composerTab: dup.composerTab,
          responseTab: dup.responseTab,
        },
      };
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
});
