import { openDB, type IDBPDatabase } from "idb";
import type { StateStorage } from "zustand/middleware";

// IndexedDB-backed StateStorage for Zustand's persist middleware.
//
// Why we moved off localStorage:
//   - localStorage caps at ~5 MB per origin in WebKit. Phase H (pre/post
//     scripts) and Phase I (Postman v2.1 / OpenAPI imports) both write
//     multi-megabyte strings into the persisted store. A typical Postman
//     v2.1 collection export is 1-3 MB; a Stripe-sized OpenAPI spec
//     generates ~600 requests with example bodies → easily 4-8 MB.
//   - localStorage.setItem throws QuotaExceededError when over the cap;
//     Zustand's persist middleware swallows that, leaving the store in
//     a half-saved state. Users see collections vanish on reload.
//
// IndexedDB has no practical size cap (gigabytes per origin in WebKit).
// The schema here is intentionally tiny: one DB (`apilab`) with one
// object store (`kv`) that maps the persist key to the JSON snapshot.
//
// Migration: on first read after the upgrade, if IDB is empty AND
// localStorage has the legacy key (`apilab.store.v1`), copy the value
// across and remove the localStorage entry. Single-shot, transparent
// to the user — they just open the new app and their workspace is
// already there.

const DB_NAME = "apilab";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
    blocked() {
      // Another tab/window holds an older version of the DB. Rare in
      // a single-window WKWebView host, but log so we know if it ever
      // happens.
      // eslint-disable-next-line no-console
      console.warn("[apilab.idb] open blocked — another DB connection is older");
    },
    blocking() {
      // We're now blocking another tab from upgrading. Close so they
      // can proceed.
      // eslint-disable-next-line no-console
      console.warn("[apilab.idb] another window wants to upgrade — closing this connection");
      dbPromise = null;
    },
    terminated() {
      // Browser killed the DB connection (out-of-memory, profile reset,
      // etc.). Reset so the next call reopens.
      dbPromise = null;
    },
  });
  return dbPromise;
}

// One-shot migration. Reads the legacy localStorage key once on first
// IDB read; if found, copies across and clears the localStorage entry.
// We keep a per-key "migrated" guard so successive reads don't keep
// hitting localStorage — once the value is in IDB, the legacy slot is
// gone anyway, but the memo skips even the localStorage existence check.
const MIGRATED = new Set<string>();

async function migrateFromLocalStorage(key: string): Promise<string | null> {
  if (MIGRATED.has(key)) return null;
  MIGRATED.add(key);
  let legacy: string | null = null;
  try {
    legacy = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    // null-origin / privacy mode — no legacy storage, nothing to migrate.
    return null;
  }
  if (legacy === null) return null;
  try {
    const db = await getDb();
    await db.put(STORE_NAME, legacy, key);
    localStorage.removeItem(key);
    // eslint-disable-next-line no-console
    console.info(`[apilab.idb] migrated ${key} from localStorage to IndexedDB`);
    return legacy;
  } catch (e) {
    // Best-effort: if the IDB write fails, leave the legacy entry
    // alone so the user doesn't lose state. Surface the failure for
    // diagnosis.
    // eslint-disable-next-line no-console
    console.error("[apilab.idb] migration failed", e);
    return null;
  }
}

export const idbStorage: StateStorage = {
  async getItem(key) {
    try {
      const db = await getDb();
      const fresh = await db.get(STORE_NAME, key);
      if (fresh != null) return String(fresh);
      // First IDB read returned nothing — try the legacy slot.
      const migrated = await migrateFromLocalStorage(key);
      return migrated;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[apilab.idb] getItem failed", e);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      const db = await getDb();
      await db.put(STORE_NAME, value, key);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[apilab.idb] setItem failed", e);
    }
  },

  async removeItem(key) {
    try {
      const db = await getDb();
      await db.delete(STORE_NAME, key);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[apilab.idb] removeItem failed", e);
    }
  },
};

// Test hook — clears the in-memory migration cache so test runs can
// re-run migration scenarios without recreating the module.
export function _resetMigratedCacheForTests(): void {
  MIGRATED.clear();
  dbPromise = null;
}
