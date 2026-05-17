/** Olgun Özoktaş geliştirdi · API Lab */
// Sync engine — orchestrates the `git.sync.*` bridge commands against
// the store. Pull-on-launch + a debounced write-on-save watcher live
// in `useSyncEngine`; `runPull` / `runPush` / `runResolve` are also
// callable directly (Settings "Sync now", the conflict banner).
//
// All paths set `syncStatus` so the UI reflects progress/failure, and
// failures are surfaced (never swallowed) per the backlog's risk note.

import { useEffect, useRef } from "react";
import { useStore } from "../store";
import {
  buildSyncPayload,
  parseSyncPayload,
  syncErrorText,
  syncPull,
  syncPush,
  syncRead,
  syncResolve,
} from "./gitSync";

const PUSH_DEBOUNCE_MS = 2000;

// Bulk-apply a remote payload to the store (replace collections +
// envs). Returns false when the payload is empty/malformed.
function applyRemote(json: string): boolean {
  const payload = parseSyncPayload(json);
  if (!payload) return false;
  useStore.setState({ collectionItems: payload.collectionItems, envs: payload.envs });
  return true;
}

// Pull from the remote and apply it. A pull conflict parks the status
// at `conflict` for the banner; any other failure surfaces as `error`.
export async function runPull(): Promise<void> {
  const { setSyncStatus } = useStore.getState();
  setSyncStatus({ state: "syncing", message: "" });
  const pull = await syncPull();
  if (pull.conflict) {
    setSyncStatus({ state: "conflict", message: "" });
    return;
  }
  if (!pull.ok) {
    setSyncStatus({ state: "error", message: syncErrorText(pull) });
    return;
  }
  const read = await syncRead();
  if (read.ok && read.content) applyRemote(read.content);
  setSyncStatus({ state: "ok", message: "", lastSyncAt: Date.now() });
}

// Push the current collections + environments to the remote.
export async function runPush(message = "API Lab sync"): Promise<void> {
  const s = useStore.getState();
  s.setSyncStatus({ state: "syncing", message: "" });
  const content = buildSyncPayload(s.collectionItems, s.envs);
  const res = await syncPush(content, message);
  if (!res.ok) {
    s.setSyncStatus({ state: "error", message: syncErrorText(res) });
    return;
  }
  s.setSyncStatus({ state: "ok", message: "", lastSyncAt: Date.now() });
}

// Resolve a sync conflict — keep local or take remote — then push the
// resolution. Taking remote re-applies the synced file to the store.
export async function runResolve(side: "local" | "remote"): Promise<void> {
  const { setSyncStatus } = useStore.getState();
  setSyncStatus({ state: "syncing", message: "" });
  const res = await syncResolve(side);
  if (!res.ok) {
    setSyncStatus({ state: "error", message: syncErrorText(res) });
    return;
  }
  if (side === "remote") {
    const read = await syncRead();
    if (read.ok && read.content) applyRemote(read.content);
  }
  setSyncStatus({ state: "ok", message: "", lastSyncAt: Date.now() });
}

// Manual "Sync now" — pull then push, skipping the push when the pull
// surfaced a conflict (the user resolves it via the banner first).
export async function runManualSync(): Promise<void> {
  await runPull();
  if (useStore.getState().syncStatus.state === "conflict") return;
  await runPush();
}

// Mount-once hook: pulls on launch (and whenever sync is switched on),
// then debounce-pushes whenever collections / environments change.
// Both halves are gated on `syncConfig.enabled` — an unconfigured /
// disabled sync does nothing.
export function useSyncEngine(): void {
  const enabled = useStore((s) => s.syncConfig.enabled);
  const collectionItems = useStore((s) => s.collectionItems);
  const envs = useStore((s) => s.envs);
  const firstChange = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    void runPull();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    // Skip the first run — that is the mount (or the launch pull's own
    // setState), not a user edit. A push of already-synced data would
    // just be a no-op `nothing to commit` anyway, but skipping it
    // avoids a pointless git round-trip every launch.
    if (firstChange.current) {
      firstChange.current = false;
      return;
    }
    const t = setTimeout(() => void runPush(), PUSH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [enabled, collectionItems, envs]);
}
