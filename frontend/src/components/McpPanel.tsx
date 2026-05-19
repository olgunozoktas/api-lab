/** Olgun Özoktaş geliştirdi · API Lab */
// MCP panel — connect to a Model Context Protocol server, list its
// tools, and invoke one. Two transports: `stdio` (a local server
// spawned via the native `mcp.stdio` bridge) and `http` (a remote
// server over Streamable HTTP). stdio is native-only — disabled when
// the bridge is absent (browser dev mode). Self-contained: all state
// is local; protocol + transport logic lives in `lib/mcp.ts`.
import { useState } from "react";
import { bridge } from "../lib/bridge";
import { mcpListTools, mcpCallTool, type McpTransport, type McpTool } from "../lib/mcp";
import { useT } from "../lib/i18n/useT";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { EmptyState } from "./ui/empty-state";

export interface McpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TransportKind = "stdio" | "http";

const inputCls =
  "w-full h-8 px-2 rounded text-xs bg-[var(--color-bg)] border border-[var(--color-border)] " +
  "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

export function McpPanel({ open, onOpenChange }: McpPanelProps) {
  const t = useT();
  // stdio needs the native bridge; default to http when it's absent
  // so the panel is still usable in browser dev mode.
  const [kind, setKind] = useState<TransportKind>(bridge.available ? "stdio" : "http");
  const [command, setCommand] = useState("npx");
  const [argsText, setArgsText] = useState("");
  const [url, setUrl] = useState("");

  const [tools, setTools] = useState<McpTool[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<McpTool | null>(null);
  const [callArgs, setCallArgs] = useState("{}");
  const [callResult, setCallResult] = useState("");

  // Build the transport from the current form fields. Args are
  // whitespace-split — one MCP server invocation, e.g. `-y pkg-name`.
  function transport(): McpTransport {
    return kind === "stdio"
      ? { kind: "stdio", command: command.trim(), args: argsText.split(/\s+/).filter(Boolean) }
      : { kind: "http", url: url.trim() };
  }

  async function handleList() {
    setBusy(true);
    setError("");
    setTools(null);
    setSelected(null);
    setCallResult("");
    const res = await mcpListTools(transport());
    setBusy(false);
    if (res.ok) setTools(res.value);
    else setError(res.error);
  }

  async function handleCall() {
    if (!selected) return;
    let args: unknown;
    try {
      args = callArgs.trim() ? JSON.parse(callArgs) : {};
    } catch {
      setCallResult(t("mcp.argsInvalid"));
      return;
    }
    setBusy(true);
    setCallResult("");
    const res = await mcpCallTool(transport(), selected.name, args);
    setBusy(false);
    setCallResult(
      res.ok ? JSON.stringify(res.value, null, 2) : t("mcp.callError", { error: res.error })
    );
  }

  function pickTool(tool: McpTool) {
    setSelected(tool);
    setCallResult("");
    // Pre-fill the args editor with the tool's input schema as a hint.
    setCallArgs(tool.inputSchema ? JSON.stringify(tool.inputSchema, null, 2) : "{}");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(640px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>{t("mcp.title")}</DialogTitle>
          <DialogDescription>{t("mcp.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* transport picker */}
          <div className="flex items-center gap-1.5">
            <Button
              variant={kind === "stdio" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setKind("stdio")}
              disabled={!bridge.available}
              title={bridge.available ? undefined : t("mcp.stdioNativeOnly")}
              aria-pressed={kind === "stdio"}
            >
              {t("mcp.transport.stdio")}
            </Button>
            <Button
              variant={kind === "http" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setKind("http")}
              aria-pressed={kind === "http"}
            >
              {t("mcp.transport.http")}
            </Button>
            {!bridge.available && (
              <span className="text-3xs text-[var(--color-fg-muted)]">
                {t("mcp.stdioNativeOnly")}
              </span>
            )}
          </div>

          {/* transport config */}
          {kind === "stdio" ? (
            <div className="flex flex-col gap-1.5">
              <input
                className={inputCls}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder={t("mcp.commandPlaceholder")}
                aria-label={t("mcp.command")}
              />
              <input
                className={inputCls}
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                placeholder={t("mcp.argsPlaceholder")}
                aria-label={t("mcp.serverArgs")}
              />
            </div>
          ) : (
            <input
              className={inputCls}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("mcp.urlPlaceholder")}
              aria-label={t("mcp.url")}
            />
          )}

          <div>
            <Button variant="primary" size="sm" onClick={() => void handleList()} disabled={busy}>
              {busy && <Spinner />}
              {t("mcp.listTools")}
            </Button>
          </div>

          {error && <p className="text-2xs text-[var(--color-danger)]">{error}</p>}

          {/* tool list */}
          {tools !== null &&
            (tools.length === 0 ? (
              <EmptyState size="compact" title={t("mcp.noTools")} />
            ) : (
              <div className="flex flex-col gap-1 max-h-48 overflow-auto">
                {tools.map((tool) => (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => pickTool(tool)}
                    className={
                      "text-left rounded border p-2 transition-colors " +
                      (selected?.name === tool.name
                        ? "border-[var(--color-accent)] bg-[var(--color-bg-elev-2)]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-bg-elev-2)]")
                    }
                  >
                    <span className="text-xs font-mono font-semibold">{tool.name}</span>
                    {tool.description && (
                      <span className="block text-3xs text-[var(--color-fg-muted)]">
                        {tool.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}

          {/* call form */}
          {selected && (
            <div className="flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-3">
              <span className="text-2xs font-semibold">
                {t("mcp.callHeading", { name: selected.name })}
              </span>
              <textarea
                className={inputCls + " h-28 py-1.5 font-mono resize-none"}
                value={callArgs}
                onChange={(e) => setCallArgs(e.target.value)}
                aria-label={t("mcp.argsLabel")}
                spellCheck={false}
              />
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleCall()}
                  disabled={busy}
                >
                  {busy && <Spinner />}
                  {t("mcp.call")}
                </Button>
              </div>
              {callResult && (
                <pre className="text-3xs font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto rounded bg-[var(--color-bg)] border border-[var(--color-border)] p-2">
                  {callResult}
                </pre>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
