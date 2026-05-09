import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";
import { migrateV2toV3, descendantIds, nextOrder } from "../internal";

function resetCollections() {
  useStore.setState({
    collectionItems: [],
    collectionsExpanded: {},
  });
}

describe("migrateV2toV3", () => {
  it("converts a flat collections list into root-level requests", () => {
    const v2 = {
      collections: [
        {
          id: "a",
          name: "Foo",
          request: {
            method: "GET",
            url: "https://x.test",
            params: [],
            headers: [],
            auth: { type: "none" as const },
            body: { mode: "none" as const, text: "" },
            gql: { query: "", vars: "" },
          },
        },
        {
          id: "b",
          name: "Bar",
          request: {
            method: "POST",
            url: "https://y.test",
            params: [],
            headers: [],
            auth: { type: "none" as const },
            body: { mode: "none" as const, text: "" },
            gql: { query: "", vars: "" },
          },
        },
      ],
    };
    const out = migrateV2toV3(v2) as any;
    expect(out.collectionItems).toHaveLength(2);
    expect(out.collectionItems[0]).toMatchObject({
      id: "a",
      parentId: null,
      kind: "request",
      name: "Foo",
      order: 0,
    });
    expect(out.collectionItems[1]).toMatchObject({
      id: "b",
      parentId: null,
      kind: "request",
      name: "Bar",
      order: 1,
    });
    expect(out.collectionItems[0].request).toBeDefined();
    expect("collections" in out).toBe(false);
    expect(out.collectionsExpanded).toEqual({});
  });

  it("handles empty v2 state gracefully", () => {
    const out = migrateV2toV3({}) as any;
    expect(out.collectionItems).toEqual([]);
    expect(out.collectionsExpanded).toEqual({});
  });
});

describe("descendantIds", () => {
  const tree = [
    { id: "f1", parentId: null, kind: "folder" as const, name: "F1", order: 0 },
    { id: "f2", parentId: "f1", kind: "folder" as const, name: "F2", order: 0 },
    { id: "r1", parentId: "f2", kind: "request" as const, name: "R1", order: 0 },
    { id: "r2", parentId: "f1", kind: "request" as const, name: "R2", order: 1 },
    { id: "r3", parentId: null, kind: "request" as const, name: "R3", order: 1 },
  ];

  it("returns all descendants of a folder (recursive)", () => {
    const ids = descendantIds(tree, "f1");
    expect(ids.sort()).toEqual(["f2", "r1", "r2"]);
  });

  it("returns empty for a leaf request", () => {
    expect(descendantIds(tree, "r3")).toEqual([]);
  });

  it("returns only direct children for a folder with no nested folders", () => {
    expect(descendantIds(tree, "f2")).toEqual(["r1"]);
  });
});

describe("nextOrder", () => {
  const items = [
    { id: "a", parentId: null, kind: "request" as const, name: "A", order: 0 },
    { id: "b", parentId: null, kind: "request" as const, name: "B", order: 1 },
    { id: "c", parentId: "f1", kind: "request" as const, name: "C", order: 5 },
  ];

  it("returns 0 for an empty parent", () => {
    expect(nextOrder(items, "missing")).toBe(0);
  });
  it("returns max+1 within the same parent", () => {
    expect(nextOrder(items, null)).toBe(2);
    expect(nextOrder(items, "f1")).toBe(6);
  });
});

describe("store actions over collectionItems", () => {
  beforeEach(() => {
    resetCollections();
  });

  it("addFolder appends a folder at root with the next order", () => {
    const id = useStore.getState().addFolder(null, "Outer");
    const items = useStore.getState().collectionItems;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id,
      parentId: null,
      kind: "folder",
      name: "Outer",
      order: 0,
    });
    expect(useStore.getState().collectionsExpanded[id]).toBe(true);
  });

  it("addFolder accepts a parentId for nested folders", () => {
    const outer = useStore.getState().addFolder(null, "Outer");
    const inner = useStore.getState().addFolder(outer, "Inner");
    const items = useStore.getState().collectionItems;
    const innerItem = items.find((i) => i.id === inner);
    expect(innerItem).toMatchObject({ parentId: outer, kind: "folder", order: 0 });
  });

  it("renameCollectionItem updates the name + ignores empty input", () => {
    const id = useStore.getState().addFolder(null, "Old");
    useStore.getState().renameCollectionItem(id, "New");
    expect(useStore.getState().collectionItems.find((i) => i.id === id)?.name).toBe("New");
    useStore.getState().renameCollectionItem(id, "   ");
    expect(useStore.getState().collectionItems.find((i) => i.id === id)?.name).toBe("New");
  });

  it("toggleFolder flips the expanded flag", () => {
    const id = useStore.getState().addFolder(null, "F");
    expect(useStore.getState().collectionsExpanded[id]).toBe(true);
    useStore.getState().toggleFolder(id);
    expect(useStore.getState().collectionsExpanded[id]).toBe(false);
    useStore.getState().toggleFolder(id);
    expect(useStore.getState().collectionsExpanded[id]).toBe(true);
  });

  it("deleteCollectionItem removes folder and all descendants recursively", () => {
    const f1 = useStore.getState().addFolder(null, "F1");
    const f2 = useStore.getState().addFolder(f1, "F2");
    useStore.getState().addFolder(f2, "F3");
    const root = useStore.getState().addFolder(null, "Sibling");
    expect(useStore.getState().collectionItems).toHaveLength(4);
    useStore.getState().deleteCollectionItem(f1);
    const items = useStore.getState().collectionItems;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(root);
    // Expanded flags also pruned
    expect(useStore.getState().collectionsExpanded[f1]).toBeUndefined();
    expect(useStore.getState().collectionsExpanded[f2]).toBeUndefined();
  });

  it("moveCollectionItem moves into a folder and auto-expands it", () => {
    const f1 = useStore.getState().addFolder(null, "F1");
    useStore.getState().toggleFolder(f1); // collapse
    expect(useStore.getState().collectionsExpanded[f1]).toBe(false);
    const f2 = useStore.getState().addFolder(null, "F2");
    useStore.getState().moveCollectionItem(f2, f1);
    const moved = useStore.getState().collectionItems.find((i) => i.id === f2);
    expect(moved?.parentId).toBe(f1);
    expect(useStore.getState().collectionsExpanded[f1]).toBe(true);
  });

  it("moveCollectionItem refuses to put a folder inside its own descendant", () => {
    const f1 = useStore.getState().addFolder(null, "F1");
    const f2 = useStore.getState().addFolder(f1, "F2");
    useStore.getState().moveCollectionItem(f1, f2);
    const f1Item = useStore.getState().collectionItems.find((i) => i.id === f1);
    expect(f1Item?.parentId).toBe(null); // unchanged
  });

  it("moveCollectionItem moves to root when parentId is null", () => {
    const f1 = useStore.getState().addFolder(null, "F1");
    const f2 = useStore.getState().addFolder(f1, "F2");
    useStore.getState().moveCollectionItem(f2, null);
    const moved = useStore.getState().collectionItems.find((i) => i.id === f2);
    expect(moved?.parentId).toBe(null);
  });
});
