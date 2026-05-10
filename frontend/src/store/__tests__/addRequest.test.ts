import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";

function reset() {
  useStore.setState({
    collectionItems: [],
    collectionsExpanded: {},
  });
}

describe("addRequest action", () => {
  beforeEach(reset);

  it("creates a request item under the given parent folder", () => {
    const folderId = useStore.getState().addFolder(null, "Folder A");
    const created = useStore.getState().addRequest(folderId, "GET users");
    const items = useStore.getState().collectionItems;

    expect(items).toHaveLength(2);
    expect(created.kind).toBe("request");
    expect(created.parentId).toBe(folderId);
    expect(created.name).toBe("GET users");
    expect(created.request).toBeDefined();
    expect(created.request?.method).toBe("GET");
    expect(created.request?.isGraphql).toBe(false);
  });

  it("creates a request at root when parentId is null", () => {
    const created = useStore.getState().addRequest(null, "Root request");
    expect(created.parentId).toBeNull();
    expect(useStore.getState().collectionItems).toHaveLength(1);
  });

  it("auto-expands the parent folder when it was collapsed", () => {
    const folderId = useStore.getState().addFolder(null, "Folder");
    // Collapse it (addFolder leaves it expanded by default).
    useStore.setState({ collectionsExpanded: {} });
    expect(useStore.getState().collectionsExpanded[folderId]).toBeUndefined();

    useStore.getState().addRequest(folderId, "child");
    expect(useStore.getState().collectionsExpanded[folderId]).toBe(true);
  });

  it("computes order as next-after-siblings under the same parent", () => {
    const folderId = useStore.getState().addFolder(null, "Folder");
    const a = useStore.getState().addRequest(folderId, "a");
    const b = useStore.getState().addRequest(folderId, "b");
    const c = useStore.getState().addRequest(folderId, "c");
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
    expect(c.order).toBe(2);
  });

  it('falls back to "Yeni istek" when name is blank', () => {
    const created = useStore.getState().addRequest(null, "   ");
    expect(created.name).toBe("Yeni istek");
  });

  it("returns a stable id that round-trips through collectionItems", () => {
    const created = useStore.getState().addRequest(null, "x");
    const found = useStore.getState().collectionItems.find((c) => c.id === created.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("x");
  });

  it("does not touch existing items", () => {
    const fooId = useStore.getState().addFolder(null, "foo");
    useStore.getState().addRequest(fooId, "child");
    const itemsBefore = useStore.getState().collectionItems.slice();
    useStore.getState().addRequest(null, "another");
    const itemsAfter = useStore.getState().collectionItems;
    // First three items should be unchanged.
    expect(itemsAfter.slice(0, 2)).toEqual(itemsBefore);
  });
});
