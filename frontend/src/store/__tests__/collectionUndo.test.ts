/** Olgun Özoktaş geliştirdi · API Lab */
// deleteCollectionItem now raises an Undo toast; restoreCollectionItems
// is the toast action's restore path. These cover the round-trip.
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";
import type { CollectionItem } from "../../lib/types";

function req(id: string, parentId: string | null, order: number): CollectionItem {
  return {
    id,
    parentId,
    kind: "request",
    name: `req ${id}`,
    order,
    request: {
      method: "GET",
      url: "https://x.test",
      params: [],
      headers: [],
      auth: { type: "none" },
      body: { mode: "none", text: "" },
      gql: { query: "", vars: "" },
    },
  };
}

function folder(id: string, parentId: string | null, order: number): CollectionItem {
  return { id, parentId, kind: "folder", name: `dir ${id}`, order };
}

beforeEach(() => {
  useStore.setState({ collectionItems: [], collectionsExpanded: {}, toasts: [] });
});

describe("deleteCollectionItem — Undo toast", () => {
  it("raises an info toast carrying an Undo action", () => {
    useStore.setState({ collectionItems: [req("a", null, 0)] });
    useStore.getState().deleteCollectionItem("a");
    const toasts = useStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].severity).toBe("info");
    expect(toasts[0].action?.label).toBeTruthy();
  });

  it("the Undo action restores the deleted item verbatim", () => {
    const item = req("a", null, 3);
    useStore.setState({ collectionItems: [item] });
    useStore.getState().deleteCollectionItem("a");
    expect(useStore.getState().collectionItems).toHaveLength(0);

    useStore.getState().toasts[0].action!.onAction();
    const restored = useStore.getState().collectionItems;
    expect(restored).toHaveLength(1);
    expect(restored[0]).toEqual(item); // id, parentId, order all intact
  });

  it("restores a whole folder subtree and its expansion state", () => {
    useStore.setState({
      collectionItems: [folder("f", null, 0), req("c", "f", 0)],
      collectionsExpanded: { f: true },
    });
    useStore.getState().deleteCollectionItem("f");
    expect(useStore.getState().collectionItems).toHaveLength(0);

    useStore.getState().toasts[0].action!.onAction();
    const st = useStore.getState();
    expect(st.collectionItems.map((c) => c.id).sort()).toEqual(["c", "f"]);
    expect(st.collectionsExpanded.f).toBe(true);
  });
});

describe("restoreCollectionItems", () => {
  it("is idempotent — re-inserting an existing id does not duplicate it", () => {
    const item = req("a", null, 0);
    useStore.setState({ collectionItems: [item] });
    useStore.getState().restoreCollectionItems([item], {});
    expect(useStore.getState().collectionItems).toHaveLength(1);
  });
});
