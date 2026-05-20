/** Olgun Özoktaş geliştirdi · API Lab */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  buildInitialState,
  migrateV1toV2,
  migrateV2toV3,
  migrateV3toV4,
  migrateV4toV5,
  migrateV5toV6,
  type CoreState,
} from "./internal";
import { idbStorage } from "./idbStorage";
import { pruneStale, RESPONSE_CACHE_TTL_MS } from "./responseCache";
import type { Store } from "./types";
import { createCollectionsSlice } from "./collections";
import { createTabsSlice } from "./tabs";
import { createEnvSlice } from "./env";
import { createHistorySlice } from "./history";
import { createExamplesSlice } from "./examples";
import { createUiSlice } from "./ui";
import { createResponseSlice } from "./response";
import { createCurrentSlice } from "./current";
import { createSamplesSlice } from "./samples";
import { createSyncSlice } from "./sync";
import { createIntegrationsSlice } from "./integrations";
import { createMcpServersSlice } from "./mcpServers";

// Multi-request workspace store. `tabs[]` is the source of truth; each tab
// carries its own request/lastResponse/composerTab/responseTab. The
// top-level `current`/`lastResponse`/`ui.composerTab`/`ui.responseTab`
// fields are MIRRORED to the active tab so leaf components stay shape-
// agnostic. Mirrors are maintained on every active-tab mutation only.
//
// Action methods are split per concern under store/<slice>.ts; this file
// is the composition root that spreads each slice creator into the
// merged Store shape and applies the persist middleware.
export const useStore = create<Store>()(
  persist(
    (...args) => ({
      ...buildInitialState(),
      ...createCollectionsSlice(...args),
      ...createTabsSlice(...args),
      ...createEnvSlice(...args),
      ...createHistorySlice(...args),
      ...createExamplesSlice(...args),
      ...createUiSlice(...args),
      ...createResponseSlice(...args),
      ...createCurrentSlice(...args),
      ...createSamplesSlice(...args),
      ...createSyncSlice(...args),
      ...createIntegrationsSlice(...args),
      ...createMcpServersSlice(...args),
    }),
    {
      name: "apilab.store.v1",
      version: 6,
      migrate: (persisted, fromVersion) => {
        let s: unknown = persisted;
        if (fromVersion < 2) s = migrateV1toV2(s);
        if (fromVersion < 3) s = migrateV2toV3(s);
        if (fromVersion < 4) s = migrateV3toV4(s);
        if (fromVersion < 5) s = migrateV4toV5(s);
        if (fromVersion < 6) s = migrateV5toV6(s);
        return s as CoreState;
      },
      // Custom merge so the persisted responseCache is TTL-pruned on
      // every hydrate — a relaunch shouldn't resurrect responses
      // cached longer ago than RESPONSE_CACHE_TTL_MS. Otherwise this
      // is the default shallow merge (persisted overrides current).
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<Store>) } as Store;
        merged.responseCache = pruneStale(
          merged.responseCache ?? {},
          RESPONSE_CACHE_TTL_MS,
          Date.now()
        );
        return merged;
      },
      // IndexedDB-backed storage. Uncaps the 5 MB localStorage limit
      // and includes a one-shot migration on first read for users
      // upgrading from the localStorage-era persisted snapshot. See
      // store/idbStorage.ts for the migration logic.
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) =>
        ({
          collectionItems: s.collectionItems,
          collectionsExpanded: s.collectionsExpanded,
          envs: s.envs,
          activeEnv: s.activeEnv,
          history: s.history,
          tabs: s.tabs,
          activeTabId: s.activeTabId,
          ui: s.ui,
          locale: s.locale,
          defaults: s.defaults,
          hiddenSampleIds: s.hiddenSampleIds,
          samplesSectionHidden: s.samplesSectionHidden,
          enabledIntegrations: s.enabledIntegrations,
          integrationFingerprints: s.integrationFingerprints,
          // Saved MCP server configs — the library backing the MCP
          // request panel. Per-tab `request.mcp` references entries
          // by id; the configs themselves live here so editing one
          // updates every request that uses it.
          mcpServers: s.mcpServers,
          // syncConfig persists (repo URL + enabled); syncStatus does
          // NOT — it's this session's runtime sync state.
          syncConfig: s.syncConfig,
          // Per-request response memory — byte-budgeted on write,
          // TTL-pruned on hydrate (see the `merge` above).
          responseCache: s.responseCache,
        }) as Store,
    }
  )
);

// Helper hook for env vars resolution. The selector returns the real
// vars reference (or undefined when no active env is set); the `??`
// fallback to a stable module-scope EMPTY_VARS happens AFTER, so the
// selector output stays stable across renders. The previous form
// (`?? {}` inside the selector) returned a fresh empty object every
// render, which Zustand's Object.is comparison saw as a new value
// every time — same React #185 infinite-render bug class as the
// ExamplesPanel fix.
const EMPTY_VARS: Readonly<Record<string, string>> = Object.freeze({});

export function useActiveVars(): Record<string, string> {
  return useStore((s) => s.envs.find((e) => e.id === s.activeEnv)?.vars) ?? EMPTY_VARS;
}
