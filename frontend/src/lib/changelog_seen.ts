// Persists "last seen changelog version" so the modal only auto-opens
// when something new shipped. Stored in IDB next to the rest of the
// app's persisted state — same `idbStorage` adapter the Zustand store
// uses. Keyed under a fixed name so localStorage is not touched.
//
// `getLastSeen()` defaults to "0.0.0" when the key is missing — this
// makes every entry "new" on first launch, which is the intended
// onboarding moment.

import { idbStorage } from "../store/idbStorage";

const KEY = "apilab.changelog.lastSeen";

export async function getLastSeen(): Promise<string> {
  try {
    const v = await idbStorage.getItem(KEY);
    if (typeof v !== "string" || v === "") return "0.0.0";
    return v;
  } catch {
    return "0.0.0";
  }
}

export async function markSeen(version: string): Promise<void> {
  try {
    await idbStorage.setItem(KEY, version);
  } catch {
    // Storage failure is non-fatal — the modal will simply re-open
    // next launch. Better than throwing past the user's view.
  }
}

// Internal — for tests.
export const _internal = { KEY };
