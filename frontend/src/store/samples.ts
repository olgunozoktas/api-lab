/** Olgun Özoktaş geliştirdi · API Lab */
import type { StateCreator } from "zustand";
import type { Store, StoreMutators } from "./types";

// Hide / show state for the built-in Samples surface. The Sample
// MANIFEST itself lives in lib/samples.ts as rebuild constants and
// cannot be deleted; this slice only tracks which sample ids the
// user has chosen to hide from the visible sidebar list, and whether
// the whole section is collapsed.
//
// Persisted via the store's `partialize` allowlist (see store/index.ts).
// The user's hidden state survives app restarts. Always-reach paths
// (⌘P, Settings → Sample Requests, empty-state CTA) read the manifest
// directly — so hidden samples remain discoverable.
export type SamplesActions = {
  hideSample: (id: string) => void;
  showSample: (id: string) => void;
  showAllSamples: () => void;
  setSamplesSectionHidden: (hidden: boolean) => void;
};

export const createSamplesSlice: StateCreator<Store, StoreMutators, [], SamplesActions> = (
  set
) => ({
  hideSample: (id) =>
    set((s) => {
      if (s.hiddenSampleIds.includes(id)) return {};
      return { hiddenSampleIds: [...s.hiddenSampleIds, id] };
    }),

  showSample: (id) =>
    set((s) => {
      if (!s.hiddenSampleIds.includes(id)) return {};
      return { hiddenSampleIds: s.hiddenSampleIds.filter((x) => x !== id) };
    }),

  showAllSamples: () =>
    set((s) => {
      // Reveal everything: clear hidden ids AND unhide the section.
      // "Show all" is the single recovery action exposed in Settings,
      // so it has to undo both axes of hiding at once.
      if (s.hiddenSampleIds.length === 0 && !s.samplesSectionHidden) return {};
      return { hiddenSampleIds: [], samplesSectionHidden: false };
    }),

  setSamplesSectionHidden: (hidden) =>
    set((s) => {
      if (s.samplesSectionHidden === hidden) return {};
      return { samplesSectionHidden: hidden };
    }),
});
