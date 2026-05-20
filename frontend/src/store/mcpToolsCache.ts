/** Olgun Özoktaş geliştirdi · API Lab */
// Session-only cache of MCP `tools/list` results, keyed by saved-
// server id. Mirrors `store/reflectionCache.ts`'s shape: a standalone
// zustand store, not in the main store's `partialize`, so re-opening
// a saved MCP request restores its tool list without re-running the
// full JSON-RPC handshake (which would re-spawn the stdio child or
// re-POST the HTTP handshake). Survives tab switches in the session;
// drops on relaunch (matches reflectionCache's choice — the handshake
// is fast enough that pinning to IDB isn't worth the budget).
//
// On server config changes (`updateMcpServer`) or deletion
// (`deleteMcpServer`), the slice calls `invalidate(serverId)` so the
// next list-tools fetch hits the wire instead of a stale cache.
import { create } from "zustand";
import type { McpTool } from "../lib/mcp";

// TTL — the handshake is cheap but a list more than ~10 minutes old
// can mislead. `getCached` treats stale entries as a cache miss.
export const MCP_TOOLS_TTL_MS = 10 * 60 * 1000;

export type McpToolsCacheEntry = { tools: McpTool[]; fetchedAt: number };

function isStale(entry: McpToolsCacheEntry, now: number): boolean {
  return now - entry.fetchedAt > MCP_TOOLS_TTL_MS;
}

type State = {
  entries: Map<string, McpToolsCacheEntry>;
};

type Actions = {
  // Returns null for both "no entry" and "entry is stale" — callers
  // never need to differentiate, both should trigger a fresh fetch.
  getCached: (serverId: string, now?: number) => McpToolsCacheEntry | null;
  setCached: (serverId: string, tools: McpTool[], now?: number) => void;
  invalidate: (serverId: string) => void;
};

export const useMcpToolsCache = create<State & Actions>((set, get) => ({
  entries: new Map(),

  getCached: (serverId, now = Date.now()) => {
    const e = get().entries.get(serverId);
    if (!e) return null;
    if (isStale(e, now)) return null;
    return e;
  },

  setCached: (serverId, tools, now = Date.now()) =>
    set((s) => {
      const next = new Map(s.entries);
      next.set(serverId, { fetchedAt: now, tools });
      return { entries: next };
    }),

  invalidate: (serverId) =>
    set((s) => {
      if (!s.entries.has(serverId)) return {};
      const next = new Map(s.entries);
      next.delete(serverId);
      return { entries: next };
    }),
}));
