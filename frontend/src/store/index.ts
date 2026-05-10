import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildInitialState, migrateV1toV2, migrateV2toV3, type CoreState } from "./internal";
import { idbStorage } from "./idbStorage";
import type { Store } from "./types";
import { createCollectionsSlice } from "./collections";
import { createTabsSlice } from "./tabs";
import { createEnvSlice } from "./env";
import { createHistorySlice } from "./history";
import { createExamplesSlice } from "./examples";
import { createUiSlice } from "./ui";
import { createResponseSlice } from "./response";
import { createCurrentSlice } from "./current";

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
    }),
    {
      name: "apilab.store.v1",
      version: 3,
      migrate: (persisted, fromVersion) => {
        let s: unknown = persisted;
        if (fromVersion < 2) s = migrateV1toV2(s);
        if (fromVersion < 3) s = migrateV2toV3(s);
        return s as CoreState;
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
