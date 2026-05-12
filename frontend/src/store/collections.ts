/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type { CollectionItem, Environment, RequestSnapshot } from "../lib/types";
import { uid } from "../lib/utils";
import { descendantIds, nextOrder } from "./internal";
import type { Store, StoreMutators } from "./types";

// Kind hint for newly-created requests. Picks a default URL prefix
// (or method + isGraphql flag) so the right protocol-specific tab is
// active as soon as the user lands on the new request — instead of
// landing on HTTP and having to type `wss://` manually.
//
// `http` is the default for back-compat with callers that don't pass
// a kind. `graphql` marks isGraphql; the runtime URL detectors handle
// `ws`, `sse`, `grpc` based on URL prefix.
export type NewRequestKind = "http" | "graphql" | "ws" | "sse" | "grpc";

export type CollectionsActions = {
  deleteCollectionItem: (id: string) => void;
  addFolder: (parentId: string | null, name: string) => string;
  addRequest: (parentId: string | null, name: string, kind?: NewRequestKind) => CollectionItem;
  renameCollectionItem: (id: string, name: string) => void;
  toggleFolder: (id: string) => void;
  moveCollectionItem: (id: string, newParentId: string | null) => void;
  importItems: (
    items: CollectionItem[],
    envVars: Record<string, string>,
    wrapperName: string
  ) => void;
};

// Default empty request snapshot for newly-created collection items.
// Mirrors `emptyRequest()` from lib/types but returns the snapshot
// shape (no id/name, isGraphql flag) that CollectionItem expects.
function emptyRequestSnapshot(kind: NewRequestKind = "http"): RequestSnapshot {
  // URL prefix per protocol — empty for HTTP/GraphQL (user picks the
  // host), `wss://` / `sses://` / `grpcs://` for the streaming ones
  // (TLS-by-default, easy to drop the `s` if not needed).
  const url =
    kind === "ws" ? "wss://" : kind === "sse" ? "sses://" : kind === "grpc" ? "grpcs://" : "";
  return {
    method: kind === "graphql" ? "POST" : "GET",
    url,
    params: [{ enabled: true, k: "", v: "" }],
    headers: [{ enabled: true, k: "", v: "" }],
    auth: { type: "none" },
    body: { mode: "none", text: "" },
    gql: { query: "", vars: "" },
    isGraphql: kind === "graphql",
  };
}

export const createCollectionsSlice: StateCreator<Store, StoreMutators, [], CollectionsActions> = (
  set
) => ({
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

  addRequest: (parentId, name, kind = "http") => {
    const id = uid();
    const trimmed = name.trim() || "Yeni istek";
    let created!: CollectionItem;
    set((s) => {
      created = {
        id,
        parentId,
        kind: "request",
        order: nextOrder(s.collectionItems, parentId),
        name: trimmed,
        request: emptyRequestSnapshot(kind),
      };
      // Auto-expand the parent folder so the new request is visible
      // (no-op when parentId === null — root has no expanded flag).
      const expanded =
        parentId !== null && !s.collectionsExpanded[parentId]
          ? { ...s.collectionsExpanded, [parentId]: true }
          : s.collectionsExpanded;
      return {
        collectionItems: [...s.collectionItems, created],
        collectionsExpanded: expanded,
      };
    });
    return created;
  },

  renameCollectionItem: (id, name) =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed) return {};
      return {
        collectionItems: s.collectionItems.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
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

  // Bulk-add a tree of items + merge env vars from an importer.
  // Items keep the IDs the importer assigned (importers must use a
  // namespace prefix like `pm_` to avoid collisions with the
  // existing local IDs). Top-level imported nodes (parentId === null)
  // get re-rooted under a fresh wrapper folder named after the
  // collection so multiple imports don't pollute the root.
  importItems: (items, envVars, wrapperName) =>
    set((s) => {
      if (items.length === 0) return {};
      const wrapperId = uid();
      const root: CollectionItem = {
        id: wrapperId,
        parentId: null,
        kind: "folder",
        order: nextOrder(s.collectionItems, null),
        name: wrapperName,
      };
      const reparented = items.map((it) =>
        it.parentId === null ? { ...it, parentId: wrapperId } : it
      );
      // Merge env vars into the active environment (or create one
      // if the user has none).
      let envs = s.envs;
      let activeEnv = s.activeEnv;
      if (Object.keys(envVars).length > 0) {
        if (envs.length === 0) {
          const newEnv: Environment = {
            id: uid(),
            name: wrapperName,
            vars: { ...envVars },
          };
          envs = [newEnv];
          activeEnv = newEnv.id;
        } else {
          envs = envs.map((e) =>
            e.id === activeEnv ? { ...e, vars: { ...e.vars, ...envVars } } : e
          );
        }
      }
      return {
        collectionItems: [...s.collectionItems, root, ...reparented],
        collectionsExpanded: { ...s.collectionsExpanded, [wrapperId]: true },
        envs,
        activeEnv,
      };
    }),
});
