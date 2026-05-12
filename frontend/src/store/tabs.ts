/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type { CollectionItem, ComposerTab, HistoryItem, OpenTab, ResponseTab } from "../lib/types";
import { emptyTab } from "../lib/types";
import { uid } from "../lib/utils";
import {
  clone,
  nextActiveAfterClose,
  snapshotActiveIntoTab,
  RECENTLY_CLOSED_CAP,
} from "./internal";
import type { Store, StoreMutators } from "./types";

// Push a closed tab onto the LIFO stack, capping the history depth.
// Most-recent-closed lives at the END so `pop()` returns it.
function pushClosed(stack: OpenTab[], tab: OpenTab): OpenTab[] {
  const next = [...stack, tab];
  if (next.length > RECENTLY_CLOSED_CAP) {
    return next.slice(next.length - RECENTLY_CLOSED_CAP);
  }
  return next;
}

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
      // Take the live mirror of the closing tab so an unsaved edit in
      // the active tab gets captured in the reopen stack. Without this
      // snapshot the user'd lose in-progress URL/body changes on
      // ⌘+W → ⌘+Shift+T.
      const snapshotted = snapshotActiveIntoTab(s);
      const closing = snapshotted.find((t) => t.id === id);
      const stack = closing ? pushClosed(s.recentlyClosed, closing) : s.recentlyClosed;
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
          recentlyClosed: stack,
        };
      }
      const filtered = snapshotted.filter((t) => t.id !== id);
      if (id === s.activeTabId) {
        const nextId = nextActiveAfterClose(snapshotted, id);
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
          recentlyClosed: stack,
        };
      }
      return { tabs: filtered, recentlyClosed: stack };
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
      // Survivors = the named tab + any pinned tabs (Chrome / Safari
      // pinned-tab semantics — pin survives bulk-close).
      const survivors = snapshotted.filter((t) => t.id === keepId || t.pinned);
      const victims = snapshotted.filter((t) => t.id !== keepId && !t.pinned);
      // No-op when nothing to close (e.g. all tabs are pinned + the
      // kept one is among them).
      if (victims.length === 0) return {};
      // Push each victim onto the reopen stack (left-to-right) so the
      // most-recent-by-position lands at the end of the LIFO.
      let stack = s.recentlyClosed;
      for (const t of victims) stack = pushClosed(stack, t);
      const survivor = survivors.find((t) => t.id === keepId) ?? survivors[0];
      return {
        tabs: survivors,
        activeTabId: survivor.id,
        current: clone(survivor.request),
        lastResponse: survivor.lastResponse,
        ui: {
          ...s.ui,
          composerTab: survivor.composerTab,
          responseTab: survivor.responseTab,
        },
        recentlyClosed: stack,
      };
    }),

  closeTabsToRight: (fromId) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === fromId);
      if (idx < 0 || idx === s.tabs.length - 1) return {};
      const snapshotted = snapshotActiveIntoTab(s);
      const head = snapshotted.slice(0, idx + 1);
      const tail = snapshotted.slice(idx + 1);
      // Pinned tabs in the right-of-anchor range survive — pin
      // semantics override "close to right". The reopen stack only
      // gets the unpinned victims.
      const pinnedSurvivors = tail.filter((t) => t.pinned);
      const dropped = tail.filter((t) => !t.pinned);
      const kept = [...head, ...pinnedSurvivors];
      if (dropped.length === 0) return {};
      // Push every dropped tab onto the reopen stack in display order
      // so ⌘+Shift+T pops the rightmost (which is the user's mental
      // model after "close to the right").
      let stack = s.recentlyClosed;
      for (const t of dropped) stack = pushClosed(stack, t);
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
        recentlyClosed: stack,
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

  reopenLastClosedTab: () =>
    set((s) => {
      if (s.recentlyClosed.length === 0) return {};
      const popped = s.recentlyClosed[s.recentlyClosed.length - 1];
      const remaining = s.recentlyClosed.slice(0, -1);
      // Snapshot the current active tab so its mirror lands back in the
      // tabs array before we tack on the popped tab + activate it.
      const snapshotted = snapshotActiveIntoTab(s);
      // The popped tab may have been closed while another tab with the
      // same id (unlikely but possible after `loadCollectionInNewTab`
      // collisions) is still open — mint a fresh id so React keys stay
      // unique.
      const restored: OpenTab = {
        ...popped,
        id: snapshotted.some((t) => t.id === popped.id) ? uid() : popped.id,
      };
      return {
        tabs: [...snapshotted, restored],
        activeTabId: restored.id,
        current: clone(restored.request),
        lastResponse: restored.lastResponse,
        ui: {
          ...s.ui,
          composerTab: restored.composerTab,
          responseTab: restored.responseTab,
        },
        recentlyClosed: remaining,
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

  openHistoryItemInNewTab: (h) =>
    set((s) => {
      const r = h.request;
      const tabs = snapshotActiveIntoTab(s);
      const composerTab: ComposerTab = r.isGraphql ? "graphql" : "params";
      const responseTab: ResponseTab = "body";
      // Tab name: short method + URL slug. Keeps the strip readable
      // when several history replays are open at once.
      const urlShort = r.url ? r.url.replace(/^https?:\/\//, "").slice(0, 32) : "—";
      const name = `${r.method} ${urlShort}`;
      const fresh: OpenTab = {
        id: uid(),
        name,
        request: {
          id: null,
          name,
          method: r.method,
          url: r.url,
          params: clone(r.params),
          headers: clone(r.headers),
          auth: clone(r.auth),
          body: clone(r.body),
          gql: clone(r.gql),
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
