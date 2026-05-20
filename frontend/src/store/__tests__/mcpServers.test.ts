/** Olgun Özoktaş geliştirdi · API Lab */
// CRUD + cascade tests for the saved MCP servers slice. The cascade
// case is the safety-critical one — deleting a server must null its
// references on every tab / collectionItem / current request (so the
// user keeps their saved toolName + argsJson) without touching
// unrelated requests.
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../index";
import { useMcpToolsCache } from "../mcpToolsCache";
import type { CollectionItem, McpServerConfig } from "../../lib/types";

function httpServer(id: string, name: string): McpServerConfig {
  return { id, name, transport: { kind: "http", url: `https://${name}.test/mcp` } };
}

function mcpRequest(id: string, parentId: string | null, serverId: string): CollectionItem {
  return {
    id,
    parentId,
    kind: "request",
    name: `mcp ${id}`,
    order: 0,
    request: {
      method: "POST",
      url: "",
      params: [],
      headers: [],
      auth: { type: "none" },
      body: { mode: "none", text: "" },
      gql: { query: "", vars: "" },
      mcp: { serverId, toolName: "search", argsJson: '{"q":"x"}' },
    },
  };
}

beforeEach(() => {
  useStore.setState({
    mcpServers: [],
    collectionItems: [],
    tabs: [],
    activeTabId: "",
    toasts: [],
  });
  useMcpToolsCache.setState({ entries: new Map() });
});

describe("addMcpServer / updateMcpServer / setMcpServers", () => {
  it("adds a server and returns its assigned id", () => {
    const id = useStore.getState().addMcpServer({
      name: "Notion",
      transport: { kind: "http", url: "https://notion.test/mcp" },
    });
    expect(id).toBeTruthy();
    const stored = useStore.getState().mcpServers;
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(id);
    expect(stored[0].name).toBe("Notion");
  });

  it("updates a server in place; the id stays stable", () => {
    const id = useStore.getState().addMcpServer({
      name: "X",
      transport: { kind: "http", url: "" },
    });
    useStore.getState().updateMcpServer(id, { name: "Y" });
    const out = useStore.getState().mcpServers;
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(id);
    expect(out[0].name).toBe("Y");
  });

  it("updateMcpServer invalidates the tools cache for that server", () => {
    const id = useStore.getState().addMcpServer({
      name: "X",
      transport: { kind: "http", url: "" },
    });
    useMcpToolsCache
      .getState()
      .setCached(id, [{ name: "old-tool", description: "", inputSchema: {} }]);
    expect(useMcpToolsCache.getState().getCached(id)).not.toBeNull();
    useStore.getState().updateMcpServer(id, { name: "Y" });
    expect(useMcpToolsCache.getState().getCached(id)).toBeNull();
  });

  it("setMcpServers replaces the whole list", () => {
    useStore.getState().setMcpServers([httpServer("a", "A"), httpServer("b", "B")]);
    expect(useStore.getState().mcpServers.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("deleteMcpServer — cascade-null on every reference", () => {
  it("removes the server from the library", () => {
    useStore.getState().setMcpServers([httpServer("a", "A"), httpServer("b", "B")]);
    useStore.getState().deleteMcpServer("a");
    expect(useStore.getState().mcpServers.map((m) => m.id)).toEqual(["b"]);
  });

  it("nulls serverId on a collectionItem that referenced the deleted server (keeps toolName + argsJson)", () => {
    const item = mcpRequest("saved-1", null, "a");
    useStore.setState({ collectionItems: [item], mcpServers: [httpServer("a", "A")] });
    useStore.getState().deleteMcpServer("a");
    const after = useStore.getState().collectionItems[0];
    expect(after.request?.mcp?.serverId).toBeNull();
    expect(after.request?.mcp?.toolName).toBe("search");
    expect(after.request?.mcp?.argsJson).toBe('{"q":"x"}');
  });

  it("leaves unrelated MCP requests intact (different serverId)", () => {
    const refersA = mcpRequest("ref-a", null, "a");
    const refersB = mcpRequest("ref-b", null, "b");
    useStore.setState({
      collectionItems: [refersA, refersB],
      mcpServers: [httpServer("a", "A"), httpServer("b", "B")],
    });
    useStore.getState().deleteMcpServer("a");
    const items = useStore.getState().collectionItems;
    expect(items.find((c) => c.id === "ref-a")?.request?.mcp?.serverId).toBeNull();
    expect(items.find((c) => c.id === "ref-b")?.request?.mcp?.serverId).toBe("b");
  });

  it("nulls serverId on tabs + current request that referenced the deleted server", () => {
    useStore.setState({
      mcpServers: [httpServer("a", "A")],
      current: {
        ...useStore.getState().current,
        mcp: { serverId: "a", toolName: "t", argsJson: "{}" },
      },
      tabs: [
        {
          id: "tab-1",
          name: "MCP",
          request: {
            ...useStore.getState().current,
            id: null,
            name: "MCP",
            mcp: { serverId: "a", toolName: "u", argsJson: "{}" },
          },
          lastResponse: null,
          composerTab: "params",
          responseTab: "body",
        },
      ],
      activeTabId: "tab-1",
    });
    useStore.getState().deleteMcpServer("a");
    expect(useStore.getState().current.mcp?.serverId).toBeNull();
    expect(useStore.getState().current.mcp?.toolName).toBe("t");
    expect(useStore.getState().tabs[0].request.mcp?.serverId).toBeNull();
    expect(useStore.getState().tabs[0].request.mcp?.toolName).toBe("u");
  });

  it("invalidates the tools cache entry for the deleted server", () => {
    useStore.setState({ mcpServers: [httpServer("a", "A")] });
    useMcpToolsCache.getState().setCached("a", [{ name: "x", description: "", inputSchema: {} }]);
    useStore.getState().deleteMcpServer("a");
    expect(useMcpToolsCache.getState().getCached("a")).toBeNull();
  });
});

describe("addRequestFromMcpServer", () => {
  it("creates a new active tab pre-wired with mcp.serverId", () => {
    const sid = useStore.getState().addMcpServer({
      name: "Notion",
      transport: { kind: "http", url: "https://notion.test/mcp" },
    });
    const tabId = useStore.getState().addRequestFromMcpServer(sid);
    const st = useStore.getState();
    expect(st.activeTabId).toBe(tabId);
    const active = st.tabs.find((t) => t.id === tabId)!;
    expect(active.request.mcp?.serverId).toBe(sid);
    expect(active.request.mcp?.toolName).toBe("");
    expect(active.request.mcp?.argsJson).toBe("{}");
    expect(st.current.mcp?.serverId).toBe(sid);
  });
});

describe("installMcpServerFromIntegration", () => {
  it("adds a row with the integrationId marker on first install", () => {
    const id = useStore
      .getState()
      .installMcpServerFromIntegration(
        "findutils",
        "findutils",
        { kind: "http", url: "https://mcp.findutils.test" },
        "MCP demo"
      );
    const stored = useStore.getState().mcpServers;
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(id);
    expect(stored[0].integrationId).toBe("findutils");
    expect(stored[0].name).toBe("findutils");
    expect(stored[0].description).toBe("MCP demo");
  });

  it("updates the existing row in place on re-install (same integrationId, same id)", () => {
    const first = useStore.getState().installMcpServerFromIntegration("findutils", "findutils", {
      kind: "http",
      url: "https://mcp.findutils.test",
    });
    const second = useStore
      .getState()
      .installMcpServerFromIntegration("findutils", "findutils v2", {
        kind: "http",
        url: "https://mcp2.findutils.test",
      });
    expect(second).toBe(first);
    const stored = useStore.getState().mcpServers;
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe("findutils v2");
    expect(stored[0].transport).toEqual({ kind: "http", url: "https://mcp2.findutils.test" });
  });

  it("re-install invalidates the tools cache for that row", () => {
    const id = useStore.getState().installMcpServerFromIntegration("findutils", "findutils", {
      kind: "http",
      url: "https://mcp.findutils.test",
    });
    useMcpToolsCache.getState().setCached(id, [{ name: "x" } as never]);
    expect(useMcpToolsCache.getState().getCached(id)).not.toBeNull();
    useStore.getState().installMcpServerFromIntegration("findutils", "findutils", {
      kind: "http",
      url: "https://mcp-new.findutils.test",
    });
    expect(useMcpToolsCache.getState().getCached(id)).toBeNull();
  });

  it("does not touch a non-integration server with the same name", () => {
    const userId = useStore.getState().addMcpServer({
      name: "findutils",
      transport: { kind: "http", url: "https://my.findutils.test" },
    });
    useStore.getState().installMcpServerFromIntegration("findutils", "findutils", {
      kind: "http",
      url: "https://mcp.findutils.test",
    });
    const stored = useStore.getState().mcpServers;
    expect(stored).toHaveLength(2);
    const user = stored.find((m) => m.id === userId);
    expect(user?.integrationId).toBeUndefined();
    expect(user?.transport).toEqual({ kind: "http", url: "https://my.findutils.test" });
  });
});

describe("removeMcpServerByIntegration", () => {
  it("removes the integration-flagged row + cascades references", () => {
    const id = useStore.getState().installMcpServerFromIntegration("findutils", "findutils", {
      kind: "http",
      url: "https://mcp.findutils.test",
    });
    useStore.setState({
      collectionItems: [mcpRequest("saved-1", null, id)],
      current: {
        ...useStore.getState().current,
        mcp: { serverId: id, toolName: "t", argsJson: "{}" },
      },
    });
    useStore.getState().removeMcpServerByIntegration("findutils");
    expect(useStore.getState().mcpServers).toHaveLength(0);
    expect(useStore.getState().collectionItems[0].request?.mcp?.serverId).toBeNull();
    expect(useStore.getState().collectionItems[0].request?.mcp?.toolName).toBe("search");
    expect(useStore.getState().current.mcp?.serverId).toBeNull();
    expect(useStore.getState().current.mcp?.toolName).toBe("t");
  });

  it("a non-integration server with the same name survives", () => {
    const userId = useStore.getState().addMcpServer({
      name: "findutils",
      transport: { kind: "http", url: "https://my.findutils.test" },
    });
    useStore.getState().installMcpServerFromIntegration("findutils", "findutils", {
      kind: "http",
      url: "https://mcp.findutils.test",
    });
    useStore.getState().removeMcpServerByIntegration("findutils");
    const stored = useStore.getState().mcpServers;
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(userId);
  });

  it("is a no-op when no integration-flagged server matches", () => {
    useStore.getState().addMcpServer({
      name: "user",
      transport: { kind: "http", url: "https://example.test" },
    });
    expect(() => useStore.getState().removeMcpServerByIntegration("nope")).not.toThrow();
    expect(useStore.getState().mcpServers).toHaveLength(1);
  });
});
