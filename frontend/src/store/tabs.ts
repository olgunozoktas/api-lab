/** Olgun Özoktaş geliştirdi · API Lab */
// Tabs slice — open / close / reorder / duplicate / pin tabs, plus the
// new-tab request loaders. Tab-list mechanics only; the shared
// request→loaded-state mapping lives in loadRequest.ts.
import type { StateCreator } from "zustand";
import type { CollectionItem, HistoryItem, OpenTab } from "../lib/types";
import { emptyTab } from "../lib/types";
import { uid } from "../lib/utils";
import { clone, snapshotActiveIntoTab } from "./internal";
import { buildLoadedRequestState, composerTabFor, currentFromSnapshot } from "./loadRequest";
import {
  closeTabState,
  closeOtherTabsState,
  closeTabsToRightState,
  reopenLastClosedTabState,
} from "./tabsClose";
import type { Store, StoreMutators } from "./types";

export type TabsActions = {
  newTab: () => void;
  closeTab: (id: string) => void;
  // Right-click context-menu actions. `keepId` stays open, everything
  // else gets closed; same activation rule as closeTab (active stays
  // active if it survives, otherwise nearest neighbor wins).
  // Pinned tabs survive bulk-close — closeOtherTabs / closeTabsToRight
  // skip them (matches Chrome / Safari pinned-tab semantics).
  closeOtherTabs: (keepId: string) => void;
  closeTabsToRight: (fromId: string) => void;
  duplicateTab: (id: string) => void;
  // Toggle the pinned flag + move the tab to the boundary between
  // pinned and unpinned so the strip stays grouped (pinned leftmost,
  // unpinned right). No-op if the id isn't found.
  togglePinTab: (id: string) => void;
  // Pop the most-recently-closed tab back into the strip + activate it.
  // No-op when the recently-closed stack is empty.
  reopenLastClosedTab: () => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  reorderTabs: (fromIdx: number, toIdx: number) => void;
  loadCollectionInNewTab: (c: CollectionItem) => void;
  // Replay a history entry in a new tab. Same shape as
  // `loadCollectionInNewTab` but for the `HistoryItem` source — keeps
  // the current tab untouched so the user can compare the original
  // vs the replayed request side-by-side.
  openHistoryItemInNewTab: (h: HistoryItem) => void;
  // Open an OpenAPI spec in a new editor tab. The tab carries a
  // `spec` payload; its `request` stays an unused empty request.
  openSpecTab: (text: string, fileName: string) => void;
  // Patch the spec text of an editor tab (the CodeMirror onChange
  // sink). No-op if `id` isn't a spec tab.
  updateSpecText: (id: string, text: string) => void;
  // Patch the custom Spectral ruleset (YAML) of a spec tab. No-op if
  // `id` isn't a spec tab.
  updateSpecRuleset: (id: string, ruleset: string) => void;
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

  closeTab: (id) => set((s) => closeTabState(s, id)),

  closeOtherTabs: (keepId) => set((s) => closeOtherTabsState(s, keepId)),

  closeTabsToRight: (fromId) => set((s) => closeTabsToRightState(s, fromId)),

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

  togglePinTab: (id) =>
    set((s) => {
      const snapshotted = snapshotActiveIntoTab(s);
      const target = snapshotted.find((t) => t.id === id);
      if (!target) return {};
      const nextPinned = !target.pinned;
      // Strip target out, flip pin flag, re-insert at the boundary
      // between pinned and unpinned so the strip stays grouped.
      const withoutTarget = snapshotted.filter((t) => t.id !== id);
      const updated: OpenTab = { ...target, pinned: nextPinned };
      // First-unpinned index in the remaining tabs — the boundary.
      let boundary = withoutTarget.findIndex((t) => !t.pinned);
      if (boundary < 0) boundary = withoutTarget.length;
      const inserted = nextPinned ? boundary : withoutTarget.length;
      const next = [...withoutTarget.slice(0, inserted), updated, ...withoutTarget.slice(inserted)];
      return { tabs: next };
    }),

  reopenLastClosedTab: () => set((s) => reopenLastClosedTabState(s)),

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
      // Shared loader state — same request→state mapping the in-place
      // loadCollection uses, so the two can't drift.
      const ld = buildLoadedRequestState(
        currentFromSnapshot(r, c.id, c.name),
        composerTabFor(r.isGraphql)
      );
      // Per-request response memory — restore the saved request's last
      // response into the new tab; null when nothing is cached.
      const restored = c.id ? (s.responseCache[c.id] ?? null) : null;
      const fresh: OpenTab = {
        id: uid(),
        name: c.name,
        request: ld.current,
        lastResponse: restored,
        composerTab: ld.composerTab,
        responseTab: ld.responseTab,
      };
      return {
        tabs: [...tabs, fresh],
        activeTabId: fresh.id,
        current: clone(fresh.request),
        lastResponse: restored,
        ui: { ...s.ui, composerTab: ld.composerTab, responseTab: ld.responseTab },
      };
    }),

  openHistoryItemInNewTab: (h) =>
    set((s) => {
      const r = h.request;
      const tabs = snapshotActiveIntoTab(s);
      // Tab name: short method + URL slug. Keeps the strip readable
      // when several history replays are open at once.
      const urlShort = r.url ? r.url.replace(/^https?:\/\//, "").slice(0, 32) : "—";
      const name = `${r.method} ${urlShort}`;
      const ld = buildLoadedRequestState(
        currentFromSnapshot(r, null, name),
        composerTabFor(r.isGraphql)
      );
      const fresh: OpenTab = {
        id: uid(),
        name,
        request: ld.current,
        lastResponse: ld.lastResponse,
        composerTab: ld.composerTab,
        responseTab: ld.responseTab,
      };
      return {
        tabs: [...tabs, fresh],
        activeTabId: fresh.id,
        current: clone(fresh.request),
        lastResponse: ld.lastResponse,
        ui: { ...s.ui, composerTab: ld.composerTab, responseTab: ld.responseTab },
      };
    }),

  openSpecTab: (text, fileName) =>
    set((s) => {
      const tabs = snapshotActiveIntoTab(s);
      const fresh: OpenTab = {
        ...emptyTab(uid()),
        name: fileName,
        spec: { text, fileName },
      };
      return {
        tabs: [...tabs, fresh],
        activeTabId: fresh.id,
        current: clone(fresh.request),
        lastResponse: null,
        ui: {
          ...s.ui,
          composerTab: fresh.composerTab,
          responseTab: fresh.responseTab,
        },
      };
    }),

  updateSpecText: (id, text) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id && t.spec ? { ...t, spec: { ...t.spec, text } } : t)),
    })),

  updateSpecRuleset: (id, ruleset) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id && t.spec ? { ...t, spec: { ...t.spec, ruleset } } : t)),
    })),
});
