/** Olgun Özoktaş geliştirdi · API Lab */
// Saved MCP servers — a named, persisted library of MCP server
// configs the user manages from the MCP servers modal. Mirrors
// `store/env.ts`'s "list + simple CRUD" shape; each entry's `id` is
// the stable handle that `request.mcp.serverId` references.
//
// Delete cascades: when a server goes away, every tab /
// collectionItem / current request that referenced it has its
// `mcp.serverId` nulled (not the whole `mcp` field), so the saved
// tool name + args stay intact and the user can re-point at a
// different server without losing their work — same pattern
// `removeIntegrationCollection` uses for integration folders.
import type { StateCreator } from "zustand";
import type { McpRequestState, McpServerConfig, McpTransport } from "../lib/types";
import { uid } from "../lib/utils";
import { useMcpToolsCache } from "./mcpToolsCache";
import type { Store, StoreMutators } from "./types";

export type McpServersActions = {
  // Add a new server config; returns the assigned id.
  addMcpServer: (cfg: Omit<McpServerConfig, "id">) => string;
  // Patch an existing server in place. No-op for an unknown id.
  updateMcpServer: (id: string, patch: Partial<Omit<McpServerConfig, "id">>) => void;
  // Remove a server + null its references on every tab / collection
  // item / current request. The saved tool name + args survive.
  deleteMcpServer: (id: string) => void;
  // Bulk replace — handy for the modal's "save all" path.
  setMcpServers: (list: McpServerConfig[]) => void;
  // Open a fresh MCP-kind tab pre-wired with the given server. Built
  // by composing `newTab` + `setCurrent` so all tab-creation rules
  // (active-tab snapshot, response-panel reset) flow through the
  // canonical actions. Returns the new tab id.
  addRequestFromMcpServer: (serverId: string) => string;
  // Install an integration-provided server into the library —
  // idempotent on `integrationId`. If a row with that integrationId
  // already exists, update its name/transport/description in place
  // (keeps the same internal id, so saved requests stay linked) and
  // invalidate its tools cache. Otherwise add a fresh row. Returns
  // the row's id.
  installMcpServerFromIntegration: (
    integrationId: string,
    name: string,
    transport: McpTransport,
    description?: string
  ) => string;
  // Tear down an integration-provided server when its integration is
  // disabled — reuses `deleteMcpServer`'s cascade so toolName +
  // argsJson on every referencing tab / collectionItem / current
  // survive while the serverId is nulled.
  removeMcpServerByIntegration: (integrationId: string) => void;
};

// Returns the same `mcp` reference when nothing changes, so callers
// can use reference equality to skip rebuilding wrapping arrays —
// every cascade hot-path tab and collection item that didn't reference
// the deleted server stays === the previous value.
function clearServerRef(
  mcp: McpRequestState | undefined,
  removedId: string
): McpRequestState | undefined {
  if (!mcp || mcp.serverId !== removedId) return mcp;
  return { ...mcp, serverId: null };
}

export const createMcpServersSlice: StateCreator<Store, StoreMutators, [], McpServersActions> = (
  set,
  get
) => ({
  addMcpServer: (cfg) => {
    const id = uid();
    set((s) => ({ mcpServers: [...s.mcpServers, { ...cfg, id }] }));
    return id;
  },

  updateMcpServer: (id, patch) => {
    set((s) => ({
      mcpServers: s.mcpServers.map((m) => (m.id === id ? { ...m, ...patch, id } : m)),
    }));
    // Tools cache holds entries keyed by serverId; a transport edit
    // means the next list-tools call must hit the wire, not a stale
    // tool set from the prior config.
    useMcpToolsCache.getState().invalidate(id);
  },

  deleteMcpServer: (id) => {
    useMcpToolsCache.getState().invalidate(id);
    set((s) => {
      const nextCurMcp = clearServerRef(s.current.mcp, id);
      const tabs = s.tabs.map((t) => {
        const nextMcp = clearServerRef(t.request.mcp, id);
        return nextMcp === t.request.mcp ? t : { ...t, request: { ...t.request, mcp: nextMcp } };
      });
      const items = s.collectionItems.map((c) => {
        if (c.kind !== "request" || !c.request) return c;
        const nextMcp = clearServerRef(c.request.mcp, id);
        return nextMcp === c.request.mcp ? c : { ...c, request: { ...c.request, mcp: nextMcp } };
      });
      return {
        mcpServers: s.mcpServers.filter((m) => m.id !== id),
        current: nextCurMcp === s.current.mcp ? s.current : { ...s.current, mcp: nextCurMcp },
        tabs,
        collectionItems: items,
      };
    });
  },

  setMcpServers: (list) => set({ mcpServers: list }),

  addRequestFromMcpServer: (serverId) => {
    // newTab handles the snapshot-active-tab + response-panel reset;
    // setCurrent then patches mcp onto the freshly-opened tab.
    get().newTab();
    get().setCurrent({ mcp: { serverId, toolName: "", argsJson: "{}" } });
    return get().activeTabId;
  },

  installMcpServerFromIntegration: (integrationId, name, transport, description) => {
    const existing = get().mcpServers.find((m) => m.integrationId === integrationId);
    if (existing) {
      // Re-apply the registry definition in place — keeps the same
      // internal id so every saved request pointing at this server
      // stays linked. Transport may have moved, so drop the cached
      // tool set; the next list call hits the wire.
      set((s) => ({
        mcpServers: s.mcpServers.map((m) =>
          m.id === existing.id ? { ...m, name, transport, description, integrationId } : m
        ),
      }));
      useMcpToolsCache.getState().invalidate(existing.id);
      return existing.id;
    }
    const id = uid();
    set((s) => ({
      mcpServers: [...s.mcpServers, { id, name, transport, description, integrationId }],
    }));
    return id;
  },

  removeMcpServerByIntegration: (integrationId) => {
    const target = get().mcpServers.find((m) => m.integrationId === integrationId);
    if (!target) return;
    // Reuse the canonical cascade — toolName + argsJson on every
    // referencing tab / item / current are preserved.
    get().deleteMcpServer(target.id);
  },
});
