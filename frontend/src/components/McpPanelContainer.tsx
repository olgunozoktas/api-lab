/** Olgun Özoktaş geliştirdi · API Lab */
// Container that wires `McpPanel` to the active tab's `current.mcp`.
// Reads the server config out of the saved-servers library, threads
// edits (toolName, argsJson) back via `setCurrent` so ⌘S persists
// them, and owns the call/result lifecycle locally because a tool
// call's result is per-run, not part of the saved request.
//
// The tools list lives in a session-only cache (`mcpToolsCache`) so
// reopening a saved MCP request shows tools instantly without
// re-running the JSON-RPC handshake; `mcpServers` invalidates the
// cache when the server's transport edits.
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { mcpListTools, mcpCallTool, type McpTool } from "../lib/mcp";
import { useMcpToolsCache } from "../store/mcpToolsCache";
import { McpPanel } from "./McpPanel";

export function McpPanelContainer() {
  const mcp = useStore((s) => s.current.mcp);
  const servers = useStore((s) => s.mcpServers);
  const setCurrent = useStore((s) => s.setCurrent);
  const t = useT();

  // Resolve the saved server config; null when the request hasn't
  // picked one OR the picked one was deleted from the library (the
  // cascade nulled `serverId` but kept the rest of `mcp`).
  const server = mcp?.serverId ? (servers.find((s) => s.id === mcp.serverId) ?? null) : null;
  const serverName = server?.name ?? null;

  // Tools cache is session-only — see store/mcpToolsCache.ts.
  const getCached = useMcpToolsCache((s) => s.getCached);
  const setCached = useMcpToolsCache((s) => s.setCached);
  const [tools, setTools] = useState<McpTool[] | null>(null);
  const [selected, setSelected] = useState<McpTool | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [callResult, setCallResult] = useState("");

  // Pull cached tools on mount / server change so reopening a saved
  // MCP request shows the list instantly. The cache key is `serverId`,
  // so switching servers correctly drops the previous list from view.
  useEffect(() => {
    setSelected(null);
    setCallResult("");
    setError("");
    if (!server) {
      setTools(null);
      return;
    }
    const cached = getCached(server.id);
    setTools(cached ? cached.tools : null);
  }, [server?.id, getCached]);

  async function handleListTools() {
    if (!server) return;
    setBusy(true);
    setError("");
    const res = await mcpListTools(server.transport);
    setBusy(false);
    if (res.ok) {
      setTools(res.value);
      setCached(server.id, res.value);
    } else {
      setError(res.error);
    }
  }

  function handlePickTool(tool: McpTool) {
    setSelected(tool);
    setCallResult("");
    // Pre-fill args from the tool's input schema if the saved snapshot
    // has nothing meaningful — but don't clobber a real edit. We only
    // pre-fill when the saved argsJson is the default "{}" placeholder.
    const argsJson =
      !mcp?.argsJson || mcp.argsJson.trim() === "{}"
        ? tool.inputSchema
          ? JSON.stringify(tool.inputSchema, null, 2)
          : "{}"
        : mcp.argsJson;
    setCurrent({ mcp: { ...mcp!, toolName: tool.name, argsJson } });
  }

  function handleArgsChange(next: string) {
    if (!mcp) return;
    setCurrent({ mcp: { ...mcp, argsJson: next } });
  }

  async function handleCall() {
    if (!server || !selected) return;
    let args: unknown;
    try {
      args = mcp?.argsJson?.trim() ? JSON.parse(mcp.argsJson) : {};
    } catch {
      setCallResult(t("mcp.argsInvalid"));
      return;
    }
    setBusy(true);
    setError("");
    setCallResult("");
    const res = await mcpCallTool(server.transport, selected.name, args);
    setBusy(false);
    if (res.ok) {
      setCallResult(JSON.stringify(res.value, null, 2));
    } else {
      setCallResult(t("mcp.callError", { error: res.error }));
    }
  }

  return (
    <McpPanel
      serverName={serverName}
      tools={tools}
      selected={selected}
      argsJson={mcp?.argsJson ?? "{}"}
      callResult={callResult}
      busy={busy}
      error={error}
      onListTools={handleListTools}
      onPickTool={handlePickTool}
      onArgsChange={handleArgsChange}
      onCall={handleCall}
    />
  );
}
