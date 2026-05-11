import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";

// =============================================================================
// Tabs slice tests.
//
// Zustand stores are singletons; we reset the in-memory state between tests
// rather than re-creating the store. The persist middleware writes to
// localStorage, but since the test environment is "node" (see vitest.config),
// it falls through to the in-memory shim defined in store/index.ts.
// =============================================================================

function reset() {
  // Snapshot the initial shape from a fresh action list, then replace
  // tabs with a single fresh one + clear other state we mutate.
  useStore.setState((s) => {
    const fresh = { ...s };
    return fresh;
  });
  useStore.getState().resetCurrent();
  // Drop all but one tab to a known state
  const { tabs } = useStore.getState();
  if (tabs.length > 1) {
    for (const t of tabs.slice(1)) useStore.getState().closeTab(t.id);
  }
}

describe("tabs", () => {
  beforeEach(() => {
    reset();
  });

  it("starts with exactly one tab", () => {
    const { tabs, activeTabId } = useStore.getState();
    expect(tabs.length).toBe(1);
    expect(tabs[0].id).toBe(activeTabId);
  });

  it("newTab() opens a fresh tab and switches to it", () => {
    const before = useStore.getState();
    useStore.getState().newTab();
    const after = useStore.getState();
    expect(after.tabs.length).toBe(before.tabs.length + 1);
    expect(after.activeTabId).toBe(after.tabs[after.tabs.length - 1].id);
    expect(after.activeTabId).not.toBe(before.activeTabId);
    expect(after.current.url).toBe(""); // new tab is empty
  });

  it("setActiveTab() snapshots the previously-active tab's transient state", () => {
    const { activeTabId: firstId } = useStore.getState();
    useStore.getState().setCurrent({ url: "https://first.example" });
    useStore.getState().newTab();
    const secondId = useStore.getState().activeTabId;
    useStore.getState().setCurrent({ url: "https://second.example" });

    // Switch back to first — its url should be restored
    useStore.getState().setActiveTab(firstId);
    expect(useStore.getState().current.url).toBe("https://first.example");

    // Forward again — second tab's url comes back
    useStore.getState().setActiveTab(secondId);
    expect(useStore.getState().current.url).toBe("https://second.example");
  });

  it("closeTab() on the active tab activates the right neighbor", () => {
    useStore.getState().newTab();
    useStore.getState().newTab();
    const tabs = useStore.getState().tabs;
    const middleId = tabs[1].id;
    useStore.getState().setActiveTab(middleId);
    useStore.getState().closeTab(middleId);
    // After closing the middle tab, the right neighbor is now at index 1
    const after = useStore.getState();
    expect(after.tabs.find((t) => t.id === middleId)).toBeUndefined();
    expect(after.activeTabId).toBe(tabs[2].id);
  });

  it("closeTab() on the only tab leaves a fresh empty tab", () => {
    const before = useStore.getState();
    expect(before.tabs.length).toBe(1);
    useStore.getState().setCurrent({ url: "https://will-be-discarded" });
    useStore.getState().closeTab(before.activeTabId);
    const after = useStore.getState();
    expect(after.tabs.length).toBe(1);
    expect(after.tabs[0].id).not.toBe(before.activeTabId); // brand new id
    expect(after.current.url).toBe("");
  });

  it("reorderTabs() moves a tab from one index to another", () => {
    useStore.getState().newTab(); // 2 tabs
    useStore.getState().newTab(); // 3 tabs
    const before = useStore.getState().tabs.slice();
    const [a, b, c] = before.map((t) => t.id);

    // Move c (idx 2) to position 0 → expected order: [c, a, b]
    useStore.getState().reorderTabs(2, 0);
    const after = useStore.getState().tabs.map((t) => t.id);
    expect(after).toEqual([c, a, b]);
  });

  it("reorderTabs() ignores out-of-range moves", () => {
    useStore.getState().newTab();
    const before = useStore.getState().tabs.map((t) => t.id);
    useStore.getState().reorderTabs(0, 99);
    expect(useStore.getState().tabs.map((t) => t.id)).toEqual(before);
    useStore.getState().reorderTabs(-1, 0);
    expect(useStore.getState().tabs.map((t) => t.id)).toEqual(before);
  });

  it("renameTab() updates the tab name + mirrors when active", () => {
    const { activeTabId } = useStore.getState();
    useStore.getState().renameTab(activeTabId, "My request");
    const after = useStore.getState();
    expect(after.tabs[0].name).toBe("My request");
    expect(after.current.name).toBe("My request");
  });

  it("renameTab() doesn't touch current.name when renaming an inactive tab", () => {
    useStore.getState().setCurrent({ name: "active-name" });
    useStore.getState().newTab(); // first becomes inactive
    const firstId = useStore.getState().tabs[0].id;
    useStore.getState().renameTab(firstId, "renamed-inactive");
    const after = useStore.getState();
    expect(after.tabs[0].name).toBe("renamed-inactive");
    // current.name comes from the now-active (second) tab
    expect(after.current.name).not.toBe("renamed-inactive");
  });

  it("setCurrent() stays mirrored to the active tab's request", () => {
    useStore.getState().setCurrent({ url: "https://x.test", method: "POST" });
    const s = useStore.getState();
    const active = s.tabs.find((t) => t.id === s.activeTabId)!;
    expect(active.request.url).toBe("https://x.test");
    expect(active.request.method).toBe("POST");
    expect(s.current.url).toBe("https://x.test");
  });

  it("setUi() mirrors composerTab + responseTab into the active tab", () => {
    useStore.getState().setUi({ composerTab: "headers", responseTab: "raw" });
    const s = useStore.getState();
    const active = s.tabs.find((t) => t.id === s.activeTabId)!;
    expect(active.composerTab).toBe("headers");
    expect(active.responseTab).toBe("raw");
    expect(s.ui.composerTab).toBe("headers");
    expect(s.ui.responseTab).toBe("raw");
  });

  it("duplicateTab() copies the source request + activates the new tab", () => {
    useStore.getState().setCurrent({ url: "https://orig.test", method: "PUT" });
    const before = useStore.getState();
    const srcId = before.activeTabId;
    useStore.getState().duplicateTab(srcId);
    const after = useStore.getState();
    expect(after.tabs).toHaveLength(before.tabs.length + 1);
    // New active tab is the duplicate, not the source
    expect(after.activeTabId).not.toBe(srcId);
    const dup = after.tabs.find((t) => t.id === after.activeTabId)!;
    expect(dup.request.url).toBe("https://orig.test");
    expect(dup.request.method).toBe("PUT");
    // Source tab still exists alongside the duplicate
    expect(after.tabs.some((t) => t.id === srcId)).toBe(true);
  });

  it("closeOtherTabs() keeps only the named tab + activates it", () => {
    // Build 3 tabs
    useStore.getState().newTab();
    useStore.getState().newTab();
    const s1 = useStore.getState();
    expect(s1.tabs.length).toBeGreaterThanOrEqual(3);
    const keepId = s1.tabs[1].id;
    useStore.getState().closeOtherTabs(keepId);
    const s2 = useStore.getState();
    expect(s2.tabs).toHaveLength(1);
    expect(s2.tabs[0].id).toBe(keepId);
    expect(s2.activeTabId).toBe(keepId);
  });

  it("closeTabsToRight() removes every tab after the anchor", () => {
    useStore.getState().newTab();
    useStore.getState().newTab();
    useStore.getState().newTab();
    const s1 = useStore.getState();
    expect(s1.tabs.length).toBeGreaterThanOrEqual(4);
    const anchorIdx = 1;
    const anchorId = s1.tabs[anchorIdx].id;
    useStore.getState().closeTabsToRight(anchorId);
    const s2 = useStore.getState();
    expect(s2.tabs).toHaveLength(anchorIdx + 1);
    expect(s2.tabs[anchorIdx].id).toBe(anchorId);
  });

  it("closeTabsToRight() on the rightmost tab is a no-op", () => {
    useStore.getState().newTab();
    const s1 = useStore.getState();
    const rightmost = s1.tabs[s1.tabs.length - 1].id;
    const lengthBefore = s1.tabs.length;
    useStore.getState().closeTabsToRight(rightmost);
    const s2 = useStore.getState();
    expect(s2.tabs).toHaveLength(lengthBefore);
  });

  it("closeTab() pushes the closed tab onto the recentlyClosed stack", () => {
    useStore.getState().newTab();
    useStore.getState().setCurrent({ url: "https://to-close.test", method: "DELETE" });
    const target = useStore.getState().activeTabId;
    useStore.getState().closeTab(target);
    const s = useStore.getState();
    expect(s.recentlyClosed.length).toBeGreaterThanOrEqual(1);
    const last = s.recentlyClosed[s.recentlyClosed.length - 1];
    expect(last.request.url).toBe("https://to-close.test");
    expect(last.request.method).toBe("DELETE");
  });

  it("reopenLastClosedTab() restores the closed tab + makes it active", () => {
    useStore.getState().newTab();
    useStore.getState().setCurrent({ url: "https://restore-me.test", method: "PUT" });
    const target = useStore.getState().activeTabId;
    useStore.getState().closeTab(target);
    const beforeReopen = useStore.getState();
    expect(beforeReopen.activeTabId).not.toBe(target);
    useStore.getState().reopenLastClosedTab();
    const s = useStore.getState();
    const active = s.tabs.find((t) => t.id === s.activeTabId)!;
    expect(active.request.url).toBe("https://restore-me.test");
    expect(active.request.method).toBe("PUT");
    expect(s.recentlyClosed).toHaveLength(beforeReopen.recentlyClosed.length - 1);
  });

  it("reopenLastClosedTab() is a no-op when the stack is empty", () => {
    useStore.setState({ recentlyClosed: [] });
    const before = useStore.getState();
    useStore.getState().reopenLastClosedTab();
    const after = useStore.getState();
    expect(after.tabs).toHaveLength(before.tabs.length);
    expect(after.activeTabId).toBe(before.activeTabId);
  });

  it("togglePinTab() flips pinned + moves the tab to the boundary", () => {
    useStore.getState().newTab();
    useStore.getState().newTab();
    const before = useStore.getState();
    const middle = before.tabs[1];
    expect(middle.pinned).toBeFalsy();
    useStore.getState().togglePinTab(middle.id);
    const after = useStore.getState();
    // Pinned tab now occupies the leftmost position (boundary === 0
    // since no other pinned tabs exist).
    expect(after.tabs[0].id).toBe(middle.id);
    expect(after.tabs[0].pinned).toBe(true);
    // Unpin → flips flag back + drops it to the right end (after all
    // unpinned tabs).
    useStore.getState().togglePinTab(middle.id);
    const final = useStore.getState();
    const last = final.tabs[final.tabs.length - 1];
    expect(last.id).toBe(middle.id);
    expect(last.pinned).toBe(false);
  });

  it("closeOtherTabs() skips pinned tabs", () => {
    useStore.getState().newTab();
    useStore.getState().newTab();
    const before = useStore.getState();
    expect(before.tabs.length).toBeGreaterThanOrEqual(3);
    // Pin the middle tab
    const middleId = before.tabs[1].id;
    useStore.getState().togglePinTab(middleId);
    // Keep the leftmost unpinned (now at index 1 after togglePin moves
    // middle to the front)
    const after1 = useStore.getState();
    const keepId = after1.tabs[1].id;
    useStore.getState().closeOtherTabs(keepId);
    const final = useStore.getState();
    // Pinned middle survives + kept tab survives
    expect(final.tabs).toHaveLength(2);
    expect(final.tabs.some((t) => t.id === middleId)).toBe(true);
    expect(final.tabs.some((t) => t.id === keepId)).toBe(true);
  });

  it("closeTabsToRight() skips pinned tabs in the closed range", () => {
    useStore.getState().newTab();
    useStore.getState().newTab();
    useStore.getState().newTab();
    const before = useStore.getState();
    expect(before.tabs.length).toBeGreaterThanOrEqual(4);
    // Pin the rightmost tab — it should survive closeTabsToRight even
    // though it's right of the anchor.
    const rightmostId = before.tabs[before.tabs.length - 1].id;
    useStore.getState().togglePinTab(rightmostId);
    // After togglePin, the pinned tab moved to the front. Need fresh
    // indices.
    const after1 = useStore.getState();
    const anchorId = after1.tabs[1].id; // first unpinned
    useStore.getState().closeTabsToRight(anchorId);
    const final = useStore.getState();
    // Pinned tab still in the list
    expect(final.tabs.some((t) => t.id === rightmostId)).toBe(true);
  });
});
