// Internal helpers extracted from store/index.ts to keep that file under
// the 400-line cap. None of these are part of the public API; they're
// imported only by store/index.ts. Adding new actions? Define helpers
// here, hold the action body in index.ts.

import type {
  Collection,
  CurrentRequest,
  HistoryItem,
  OpenTab,
  ResponseSnapshot,
  UiState,
  Environment,
  RequestDefaults,
} from "../lib/types";
import { emptyRequest, emptyTab, defaultRequestDefaults } from "../lib/types";
import { uid } from "../lib/utils";
import { detectLocale, type Locale } from "../lib/i18n";

export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// Shape of the persisted/runtime state (action methods live in index.ts).
export type CoreState = {
  collections: Collection[];
  envs: Environment[];
  activeEnv: string;
  history: HistoryItem[];
  tabs: OpenTab[];
  activeTabId: string;
  current: CurrentRequest;
  lastResponse: ResponseSnapshot | null;
  ui: UiState;
  locale: Locale;
  defaults: RequestDefaults;
  toast: { msg: string; ts: number } | null;
};

// Build the initial workspace with a single empty tab so `tabs[]` is
// never empty (callers can always assume `activeTabId` resolves).
export function buildInitialState(): CoreState {
  const firstTab = emptyTab(uid());
  return {
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
    tabs: [firstTab],
    activeTabId: firstTab.id,
    current: clone(firstTab.request),
    lastResponse: firstTab.lastResponse,
    ui: {
      theme: "auto",
      composerTab: firstTab.composerTab,
      responseTab: firstTab.responseTab,
      sidebarTab: "collections",
    },
    locale: detectLocale("tr"),
    defaults: defaultRequestDefaults(),
    toast: null,
  };
}

// Snapshot of the editable mirrors → write back to the active tab's slot.
// Used whenever we need to capture transient state before doing a tab
// switch or persisting.
export function snapshotActiveIntoTab(s: CoreState): OpenTab[] {
  return s.tabs.map((t) =>
    t.id === s.activeTabId
      ? {
          ...t,
          name: s.current.name?.trim() || t.name,
          request: clone(s.current),
          lastResponse: s.lastResponse,
          composerTab: s.ui.composerTab,
          responseTab: s.ui.responseTab,
        }
      : t
  );
}

// Pick which tab to activate after closing `closingId`. Choose the
// neighbor on the right; if there isn't one, fall back to the left.
export function nextActiveAfterClose(tabs: OpenTab[], closingId: string): string {
  const idx = tabs.findIndex((t) => t.id === closingId);
  if (idx < 0) return tabs[0]?.id ?? "";
  const right = tabs[idx + 1];
  const left = tabs[idx - 1];
  return (right ?? left)?.id ?? "";
}

// v0/v1 (no `tabs` field) → v2 migration. Convert the old top-level
// `current` + `lastResponse` into a single tab so the user's last-open
// request survives the upgrade.
export function migrateV1toV2(persisted: unknown): CoreState {
  const old =
    (persisted as Partial<CoreState> & {
      current?: CurrentRequest;
      lastResponse?: ResponseSnapshot | null;
    }) ?? {};
  const oldCurrent = old.current ?? emptyRequest();
  const tab: OpenTab = {
    id: uid(),
    name: oldCurrent.name?.trim() || "Yeni istek",
    request: oldCurrent,
    lastResponse: old.lastResponse ?? null,
    composerTab: old.ui?.composerTab ?? "params",
    responseTab: old.ui?.responseTab ?? "body",
  };
  return {
    ...old,
    tabs: [tab],
    activeTabId: tab.id,
    current: clone(tab.request),
    lastResponse: tab.lastResponse,
    ui: {
      theme: old.ui?.theme ?? "auto",
      composerTab: tab.composerTab,
      responseTab: tab.responseTab,
      sidebarTab: old.ui?.sidebarTab ?? "collections",
    },
    // Re-init missing top-level fields with sensible defaults
    collections: old.collections ?? [],
    envs: old.envs ?? [{ id: "default", name: "default", vars: {} }],
    activeEnv: old.activeEnv ?? "default",
    history: old.history ?? [],
    locale: old.locale ?? detectLocale("tr"),
    defaults: old.defaults ?? defaultRequestDefaults(),
    toast: null,
  };
}

// Storage adapter — falls back to in-memory map under null-origin
// (e.g. assets-mode test environments) so the store never throws on init.
export function safeLocalStorage(): Storage {
  try {
    const _t = "__t";
    localStorage.setItem(_t, "1");
    localStorage.removeItem(_t);
    return localStorage;
  } catch {
    const mem: Record<string, string> = {};
    return {
      length: 0,
      key: () => null,
      clear: () => {
        for (const k of Object.keys(mem)) delete mem[k];
      },
      getItem: (k: string) => mem[k] ?? null,
      setItem: (k: string, v: string) => {
        mem[k] = v;
      },
      removeItem: (k: string) => {
        delete mem[k];
      },
    };
  }
}
