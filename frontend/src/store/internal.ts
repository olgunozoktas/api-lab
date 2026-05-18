/** Olgun Özoktaş geliştirdi · API Lab */
// Internal helpers extracted from store/index.ts to keep that file under
// the 400-line cap. None of these are part of the public API; they're
// imported only by store/index.ts. Adding new actions? Define helpers
// here, hold the action body in index.ts.

import type {
  Collection,
  CollectionItem,
  CurrentRequest,
  HistoryItem,
  OpenTab,
  ResponseSnapshot,
  UiState,
  Environment,
  RequestDefaults,
  SyncConfig,
  SyncStatus,
} from "../lib/types";
import {
  emptyRequest,
  emptyTab,
  defaultRequestDefaults,
  defaultSyncConfig,
  defaultSyncStatus,
  DEFAULT_LAYOUT,
} from "../lib/types";
import type { ToastEntry } from "../lib/toast";
import { uid } from "../lib/utils";
import { detectLocale, type Locale } from "../lib/i18n";

export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// Shape of the persisted/runtime state (action methods live in index.ts).
// `collectionItems` is the v3 tree shape; folders + requests live in one
// flat array keyed by parentId. `collectionsExpanded` is per-folder UI
// state — true means the folder is open in the sidebar tree.
export type CoreState = {
  collectionItems: CollectionItem[];
  collectionsExpanded: Record<string, boolean>;
  envs: Environment[];
  activeEnv: string;
  history: HistoryItem[];
  tabs: OpenTab[];
  activeTabId: string;
  current: CurrentRequest;
  lastResponse: ResponseSnapshot | null;
  // Per-saved-request response memory, keyed by CollectionItem id.
  // Session-only — NOT in `partialize` — so re-selecting a request
  // restores its last response without persisting bodies to IDB.
  // See store/responseCache.ts.
  responseCache: Record<string, ResponseSnapshot>;
  ui: UiState;
  locale: Locale;
  defaults: RequestDefaults;
  toasts: ToastEntry[];
  // LIFO stack of recently-closed tabs (most recent at end). Powers
  // `reopenLastClosedTab` (⌘+Shift+T). Intentionally NOT persisted —
  // not listed in the store's `partialize` key set — so it lives only
  // for the current session, matching browser behaviour.
  recentlyClosed: OpenTab[];
  // Per-id hidden state for the built-in Samples surface. See
  // store/samples.ts + lib/samples.ts. Persisted via partialize.
  hiddenSampleIds: string[];
  samplesSectionHidden: boolean;
  // Registry ids of integrations the user has enabled from the
  // integrations gallery. Persisted via partialize.
  enabledIntegrations: string[];
  // Optional git-based collection sync. `syncConfig` is persisted;
  // `syncStatus` is runtime-only (omitted from the store's partialize).
  syncConfig: SyncConfig;
  syncStatus: SyncStatus;
};

// Cap for the recently-closed stack. Mirrors Chrome's "Recently
// closed" footprint — beyond ~10 the user usually moves on.
export const RECENTLY_CLOSED_CAP = 10;

// Build the initial workspace with a single empty tab so `tabs[]` is
// never empty (callers can always assume `activeTabId` resolves).
export function buildInitialState(): CoreState {
  const firstTab = emptyTab(uid());
  return {
    collectionItems: [
      {
        id: uid(),
        parentId: null,
        kind: "request",
        order: 0,
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
    collectionsExpanded: {},
    envs: [{ id: "default", name: "default", vars: {} }],
    activeEnv: "default",
    history: [],
    tabs: [firstTab],
    activeTabId: firstTab.id,
    current: clone(firstTab.request),
    lastResponse: firstTab.lastResponse,
    responseCache: {},
    ui: {
      theme: "auto",
      composerTab: firstTab.composerTab,
      responseTab: firstTab.responseTab,
      sidebarTab: "collections",
      layout: DEFAULT_LAYOUT,
    },
    locale: detectLocale("tr"),
    defaults: defaultRequestDefaults(),
    toasts: [],
    recentlyClosed: [],
    hiddenSampleIds: [],
    samplesSectionHidden: false,
    enabledIntegrations: [],
    syncConfig: defaultSyncConfig(),
    syncStatus: defaultSyncStatus(),
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
          // Spec-editor tabs name themselves after the spec file, not
          // the (unused) request mirror — keep `t.name` for them.
          name: t.spec ? t.name : s.current.name?.trim() || t.name,
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
// request survives the upgrade. Now returns the v2 shape (with the
// legacy `collections` field) — v2→v3 then promotes that into the
// tree shape.
type V2State = Omit<CoreState, "collectionItems" | "collectionsExpanded"> & {
  collections: Collection[];
};

export function migrateV1toV2(persisted: unknown): V2State {
  const old =
    (persisted as Partial<V2State> & {
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
      layout: old.ui?.layout ?? DEFAULT_LAYOUT,
    },
    // Re-init missing top-level fields with sensible defaults
    collections: old.collections ?? [],
    envs: old.envs ?? [{ id: "default", name: "default", vars: {} }],
    activeEnv: old.activeEnv ?? "default",
    history: old.history ?? [],
    locale: old.locale ?? detectLocale("tr"),
    defaults: old.defaults ?? defaultRequestDefaults(),
    recentlyClosed: old.recentlyClosed ?? [],
    hiddenSampleIds: old.hiddenSampleIds ?? [],
    samplesSectionHidden: old.samplesSectionHidden ?? false,
    syncConfig: old.syncConfig ?? defaultSyncConfig(),
    syncStatus: old.syncStatus ?? defaultSyncStatus(),
    toasts: [],
    enabledIntegrations: [],
    responseCache: {},
  };
}

// v2 (flat `collections: Collection[]`) → v3 (tree `collectionItems:
// CollectionItem[]`) migration. Each old collection becomes a root-
// level request — no folders are introduced automatically; the user
// can group them later via the new "+ New folder" button. Order
// preserved by array index.
export function migrateV2toV3(persisted: unknown): CoreState {
  const old = (persisted as Partial<V2State>) ?? {};
  const oldCollections: Collection[] = old.collections ?? [];
  const collectionItems: CollectionItem[] = oldCollections.map((c, i) => ({
    id: c.id,
    parentId: null,
    kind: "request" as const,
    name: c.name,
    order: i,
    request: c.request,
  }));
  // Strip the legacy `collections` field; downstream code only knows
  // `collectionItems`. Object spread first so we override known keys.
  const { collections: _drop, ...rest } = old;
  void _drop;
  // Spread persisted state after the initial defaults, then re-pin the
  // fields added in versions after V2 so older snapshots don't surface
  // them as undefined and trip the CoreState shape check. Each new
  // field added to CoreState in a future version needs the same
  // treatment here.
  return {
    ...buildInitialState(),
    ...rest,
    collectionItems,
    collectionsExpanded: {},
    hiddenSampleIds: [],
    samplesSectionHidden: false,
    enabledIntegrations: [],
  } as CoreState;
}

// Recursive descendants helper — returns the IDs of every descendant of
// `parentId` in `items`. Used by deleteItem (collect-then-purge) and by
// drag-into-folder validation (refuse to drop a folder into one of its
// own descendants).
export function descendantIds(
  items: CollectionItem[],
  parentId: string,
  acc: string[] = []
): string[] {
  for (const it of items) {
    if (it.parentId === parentId) {
      acc.push(it.id);
      if (it.kind === "folder") descendantIds(items, it.id, acc);
    }
  }
  return acc;
}

// Compute the next `order` for a new item under `parentId`.
export function nextOrder(items: CollectionItem[], parentId: string | null): number {
  let max = -1;
  for (const it of items) {
    if (it.parentId === parentId && it.order > max) max = it.order;
  }
  return max + 1;
}
