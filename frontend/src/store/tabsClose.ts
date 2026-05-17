/** Olgun Özoktaş geliştirdi · API Lab */
// Close / reopen tab-action computations, extracted from store/tabs.ts
// to keep that slice file under the 400-line cap. Each exported
// function is the pure body of a `set((s) => ...)` call — it takes the
// current store state and returns the partial update, with no side
// effects. `store/tabs.ts` wires them: `closeTab: (id) => set((s) =>
// closeTabState(s, id))`.

import type { OpenTab } from "../lib/types";
import { emptyTab } from "../lib/types";
import { uid } from "../lib/utils";
import {
  clone,
  nextActiveAfterClose,
  snapshotActiveIntoTab,
  RECENTLY_CLOSED_CAP,
} from "./internal";
import type { Store } from "./types";

// Push a closed tab onto the LIFO stack, capping the history depth.
// Most-recent-closed lives at the END so `pop()` returns it.
export function pushClosed(stack: OpenTab[], tab: OpenTab): OpenTab[] {
  const next = [...stack, tab];
  if (next.length > RECENTLY_CLOSED_CAP) {
    return next.slice(next.length - RECENTLY_CLOSED_CAP);
  }
  return next;
}

export function closeTabState(s: Store, id: string): Partial<Store> {
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
}

export function closeOtherTabsState(s: Store, keepId: string): Partial<Store> {
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
}

export function closeTabsToRightState(s: Store, fromId: string): Partial<Store> {
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
}

export function reopenLastClosedTabState(s: Store): Partial<Store> {
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
}
