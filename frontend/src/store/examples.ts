/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type { CurrentRequest, Example } from "../lib/types";
import { clone } from "./internal";
import type { Store, StoreMutators } from "./types";

export type ExamplesActions = {
  addExample: (example: Example) => void;
  renameExample: (exampleId: string, name: string) => void;
  deleteExample: (exampleId: string) => void;
};

// Examples — saved-response captures used by the (forthcoming
// Zig sidecar) mock server. Each is keyed off a saved request:
// we mirror writes into both `current` (so the active panel
// shows them) AND the matching CollectionItem.request.examples
// (so they persist across reloads + survive into the saved
// collection). When the active request hasn't been saved yet
// (id === null) we only update `current` — the user has to
// hit Save to persist examples.
export const createExamplesSlice: StateCreator<Store, StoreMutators, [], ExamplesActions> = (
  set
) => ({
  addExample: (example) =>
    set((s) => {
      const id = s.current.id;
      const cur: CurrentRequest = {
        ...s.current,
        examples: [...(s.current.examples ?? []), example],
      };
      const tabs = s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, request: clone(cur) } : t));
      if (!id) return { current: cur, tabs };
      const items = s.collectionItems.map((c) =>
        c.id === id && c.kind === "request" && c.request
          ? {
              ...c,
              request: { ...c.request, examples: cur.examples },
            }
          : c
      );
      return { current: cur, tabs, collectionItems: items };
    }),

  renameExample: (exampleId, name) =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed) return {};
      const next = (s.current.examples ?? []).map((e) =>
        e.id === exampleId ? { ...e, name: trimmed } : e
      );
      const cur = { ...s.current, examples: next };
      const tabs = s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, request: clone(cur) } : t));
      if (!s.current.id) return { current: cur, tabs };
      const items = s.collectionItems.map((c) =>
        c.id === s.current.id && c.kind === "request" && c.request
          ? { ...c, request: { ...c.request, examples: next } }
          : c
      );
      return { current: cur, tabs, collectionItems: items };
    }),

  deleteExample: (exampleId) =>
    set((s) => {
      const next = (s.current.examples ?? []).filter((e) => e.id !== exampleId);
      const cur = { ...s.current, examples: next };
      const tabs = s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, request: clone(cur) } : t));
      if (!s.current.id) return { current: cur, tabs };
      const items = s.collectionItems.map((c) =>
        c.id === s.current.id && c.kind === "request" && c.request
          ? { ...c, request: { ...c.request, examples: next } }
          : c
      );
      return { current: cur, tabs, collectionItems: items };
    }),
});
