/** Olgun Özoktaş geliştirdi · API Lab */
// Git-based collection sync — payload (de)serialisation + thin wrappers
// over the `git.sync.*` bridge commands. Collections + environments
// mirror to a single `api-lab-sync.json` in a git clone the Zig
// handler owns; this module builds/parses that file's contents and
// drives the handler.

import { bridge } from "./bridge";
import type { CollectionItem, Environment } from "./types";

export const SYNC_SCHEMA_VERSION = 1;

export type SyncPayload = {
  schemaVersion: number;
  exportedAt: number;
  collectionItems: CollectionItem[];
  envs: Environment[];
};

// Serialise collections + environments to the synced-file JSON. Pure.
export function buildSyncPayload(
  collectionItems: CollectionItem[],
  envs: Environment[],
  now: number = Date.now()
): string {
  const payload: SyncPayload = {
    schemaVersion: SYNC_SCHEMA_VERSION,
    exportedAt: now,
    collectionItems,
    envs,
  };
  return JSON.stringify(payload, null, 2);
}

// Parse + validate a synced-file JSON string. Returns null on empty,
// malformed, wrong-schema, or shape-invalid input — the caller treats
// null as "nothing usable to apply". Pure.
export function parseSyncPayload(json: string): SyncPayload | null {
  if (!json || !json.trim()) return null;
  try {
    const obj = JSON.parse(json) as Partial<SyncPayload>;
    if (obj.schemaVersion !== SYNC_SCHEMA_VERSION) return null;
    if (!Array.isArray(obj.collectionItems) || !Array.isArray(obj.envs)) return null;
    return {
      schemaVersion: SYNC_SCHEMA_VERSION,
      exportedAt: typeof obj.exportedAt === "number" ? obj.exportedAt : 0,
      collectionItems: obj.collectionItems as CollectionItem[],
      envs: obj.envs as Environment[],
    };
  } catch {
    return null;
  }
}

// ── bridge wrappers ─────────────────────────────────────────────────

export type SyncOpResult = {
  ok?: boolean;
  configured?: boolean;
  conflict?: boolean;
  nothingToCommit?: boolean;
  content?: string;
  error?: string;
  stderr?: string;
};

// Combine a result's `error` + `stderr` into one human line.
export function syncErrorText(r: SyncOpResult): string {
  if (!r.error) return "";
  return r.stderr ? `${r.error} — ${r.stderr}` : r.error;
}

export async function syncStatus(): Promise<SyncOpResult> {
  if (!bridge.available) return { configured: false };
  return bridge.invoke<SyncOpResult>("git.sync.status", {});
}

export async function syncSetup(url: string): Promise<SyncOpResult> {
  return bridge.invoke<SyncOpResult>("git.sync.setup", { url });
}

export async function syncPull(): Promise<SyncOpResult> {
  return bridge.invoke<SyncOpResult>("git.sync.pull", {});
}

export async function syncRead(): Promise<SyncOpResult> {
  return bridge.invoke<SyncOpResult>("git.sync.read", {});
}

export async function syncPush(content: string, message: string): Promise<SyncOpResult> {
  return bridge.invoke<SyncOpResult>("git.sync.push", { content, message });
}

export async function syncResolve(side: "local" | "remote"): Promise<SyncOpResult> {
  return bridge.invoke<SyncOpResult>("git.sync.resolve", { side });
}
