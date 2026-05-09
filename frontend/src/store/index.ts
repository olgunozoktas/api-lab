import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Collection, Environment, HistoryItem, CurrentRequest,
  ResponseSnapshot, UiState, RequestSnapshot,
} from "../lib/types";
import { emptyRequest } from "../lib/types";
import { uid } from "../lib/utils";
import { detectLocale, type Locale } from "../lib/i18n";

type State = {
  collections: Collection[];
  envs: Environment[];
  activeEnv: string;
  history: HistoryItem[];
  current: CurrentRequest;
  ui: UiState;
  locale: Locale;
  lastResponse: ResponseSnapshot | null;
  toast: { msg: string; ts: number } | null;
};

type Actions = {
  setCurrent: (patch: Partial<CurrentRequest>) => void;
  resetCurrent: () => void;
  loadCollection: (c: Collection) => void;
  loadHistoryItem: (h: HistoryItem) => void;
  saveCurrent: () => void;
  deleteCollection: (id: string) => void;
  setActiveEnv: (id: string) => void;
  setUi: (patch: Partial<UiState>) => void;
  setEnvs: (envs: Environment[]) => void;
  setLocale: (l: Locale) => void;
  pushHistory: (snap: RequestSnapshot, status: number, sizeBytes: number, elapsedMs: number) => void;
  clearHistory: () => void;
  setLastResponse: (r: ResponseSnapshot | null) => void;
  showToast: (msg: string) => void;
};

const initial = (): State => ({
  collections: [
    {
      id: uid(),
      name: "Github user (örnek)",
      request: {
        method: "GET",
        url: "https://api.github.com/users/octocat",
        params: [{ enabled: true, k: "", v: "" }],
        headers: [{ enabled: true, k: "Accept", v: "application/vnd.github+json" }],
        auth: { type: "none" },
        body: { mode: "none", text: "" },
        gql: { query: "", vars: "" },
        isGraphql: false,
      },
    },
  ],
  envs: [{ id: "default", name: "default", vars: {} }],
  activeEnv: "default",
  history: [],
  current: emptyRequest(),
  ui: { theme: "auto", composerTab: "params", responseTab: "body", sidebarTab: "collections" },
  locale: detectLocale("tr"),
  lastResponse: null,
  toast: null,
});

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),

      setCurrent: (patch) => set((s) => ({ current: { ...s.current, ...patch } })),
      resetCurrent: () => set({ current: emptyRequest(), ui: { ...get().ui, composerTab: "params" } }),

      loadCollection: (c) => set(() => ({
        current: {
          id: c.id,
          name: c.name,
          method: c.request.method ?? "GET",
          url: c.request.url ?? "",
          params: clone(c.request.params ?? [{ enabled: true, k: "", v: "" }]),
          headers: clone(c.request.headers ?? [{ enabled: true, k: "", v: "" }]),
          auth: clone(c.request.auth ?? { type: "none" }),
          body: clone(c.request.body ?? { mode: "none", text: "" }),
          gql: clone(c.request.gql ?? { query: "", vars: "" }),
        },
        ui: { ...get().ui, composerTab: c.request.isGraphql ? "graphql" : "params" },
      })),

      loadHistoryItem: (h) => set(() => ({
        current: {
          id: null,
          name: get().current.name,
          method: h.request.method,
          url: h.request.url,
          params: clone(h.request.params),
          headers: clone(h.request.headers),
          auth: clone(h.request.auth),
          body: clone(h.request.body),
          gql: clone(h.request.gql),
        },
        ui: { ...get().ui, composerTab: h.request.isGraphql ? "graphql" : "params" },
      })),

      saveCurrent: () => {
        const cur = get().current;
        const name = cur.name?.trim() || "(adsız)";
        const isGraphql = get().ui.composerTab === "graphql";
        const snap: RequestSnapshot = {
          method: cur.method, url: cur.url,
          params: clone(cur.params), headers: clone(cur.headers),
          auth: clone(cur.auth), body: clone(cur.body), gql: clone(cur.gql),
          isGraphql,
        };
        const cols = get().collections.slice();
        if (cur.id) {
          const i = cols.findIndex((c) => c.id === cur.id);
          if (i >= 0) cols[i] = { id: cur.id, name, request: snap };
        } else {
          const id = uid();
          cols.unshift({ id, name, request: snap });
          set({ current: { ...cur, id, name } });
        }
        set({ collections: cols });
        get().showToast("Kaydedildi");
      },

      deleteCollection: (id) => set((s) => ({
        collections: s.collections.filter((c) => c.id !== id),
        current: s.current.id === id ? { ...s.current, id: null } : s.current,
      })),

      setActiveEnv: (id) => set({ activeEnv: id }),
      setUi: (patch) => set((s) => ({ ui: { ...s.ui, ...patch } })),
      setEnvs: (envs) => set({ envs }),
      setLocale: (locale) => set({ locale }),

      pushHistory: (snap, status, sizeBytes, elapsedMs) => set((s) => {
        const item: HistoryItem = {
          id: uid(), ts: Date.now(),
          request: snap, response: { status, sizeBytes, elapsedMs },
        };
        const next = [item, ...s.history];
        if (next.length > 200) next.length = 200;
        return { history: next };
      }),

      clearHistory: () => set({ history: [] }),
      setLastResponse: (r) => set({ lastResponse: r }),
      showToast: (msg) => set({ toast: { msg, ts: Date.now() } }),
    }),
    {
      name: "apilab.store.v1",
      storage: createJSONStorage(() => {
        try {
          const _t = "__t"; localStorage.setItem(_t, "1"); localStorage.removeItem(_t);
          return localStorage;
        } catch {
          // SecurityError under null-origin contexts — fall back to a no-op.
          const mem: Record<string, string> = {};
          return {
            getItem: (k: string) => mem[k] ?? null,
            setItem: (k: string, v: string) => { mem[k] = v; },
            removeItem: (k: string) => { delete mem[k]; },
          };
        }
      }),
      partialize: (s) => ({
        collections: s.collections,
        envs: s.envs,
        activeEnv: s.activeEnv,
        history: s.history,
        ui: s.ui,
        locale: s.locale,
      }) as State,
    },
  ),
);

// Helper hook for env vars resolution
export function useActiveVars(): Record<string, string> {
  return useStore((s) => s.envs.find((e) => e.id === s.activeEnv)?.vars ?? {});
}
