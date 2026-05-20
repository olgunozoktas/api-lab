/** Olgun Özoktaş geliştirdi · API Lab */
// MCP request panel — the tab body when `current.mcp` is set. Pure
// presenter: every piece of state (which server, which tool, args
// text, last result, busy/error flags) is owned by `McpPanelContainer`
// and threaded through props. Drops in next to WsPanel / SsePanel /
// GrpcPanel as the fourth protocol-specific panel in App.tsx routing.
//
// The transport form lives elsewhere now — server configs are managed
// in `McpServersModal` and selected via `McpServerBar` (which sits
// where the URL bar would normally render). This panel only worries
// about: list tools, pick one, type args, call.
import { useT } from "../lib/i18n/useT";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import type { McpTool } from "../lib/mcp";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { EmptyState } from "./ui/empty-state";

const inputCls =
  "w-full px-2 rounded text-xs bg-[var(--color-bg)] border border-[var(--color-border)] " +
  "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";

export interface McpPanelProps {
  // null = no server picked yet; the container surfaces a "pick a
  // server" empty state via `tools === null` + `noServer === true`.
  serverName: string | null;
  // null = tools/list hasn't run yet; [] = ran successfully but the
  // server exposes no tools.
  tools: McpTool[] | null;
  selected: McpTool | null;
  argsJson: string;
  callResult: string;
  busy: boolean;
  error: string;
  onListTools: () => void;
  onPickTool: (tool: McpTool) => void;
  onArgsChange: (next: string) => void;
  onCall: () => void;
}

export function McpPanel(p: McpPanelProps) {
  const t = useT();
  // Spinner only surfaces past the delay threshold — a sub-100ms list
  // call doesn't flash a placeholder.
  const showSpinner = useDelayedFlag(p.busy);
  const noServer = p.serverName === null;

  if (noServer) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState title={t("mcp.requestPanel.noServer")} />
      </div>
    );
  }

  return (
    <section className="bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center gap-3 flex-wrap">
        <Button variant="primary" size="sm" onClick={p.onListTools} disabled={p.busy}>
          {showSpinner && <Spinner />}
          {p.tools === null ? t("mcp.listTools") : t("mcp.requestPanel.tools.refresh")}
        </Button>
        {p.tools !== null && (
          <span className="text-2xs text-[var(--color-fg-muted)]">
            {t("mcp.requestPanel.tools.count", { n: String(p.tools.length) })}
          </span>
        )}
        {p.error && (
          <span className="text-2xs text-[var(--color-danger)] truncate flex-1">{p.error}</span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
        {p.tools === null ? (
          <EmptyState
            size="compact"
            title={t("mcp.requestPanel.tools.notListed", { name: p.serverName ?? "" })}
          />
        ) : p.tools.length === 0 ? (
          <EmptyState size="compact" title={t("mcp.noTools")} />
        ) : (
          <div className="flex flex-col gap-1">
            {p.tools.map((tool) => (
              <button
                key={tool.name}
                type="button"
                onClick={() => p.onPickTool(tool)}
                className={
                  "text-left rounded border p-2 transition-colors " +
                  (p.selected?.name === tool.name
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
        )}

        {p.selected && (
          <div className="flex flex-col gap-1.5 border-t border-[var(--color-border)] pt-3">
            <span className="text-2xs font-semibold">
              {t("mcp.callHeading", { name: p.selected.name })}
            </span>
            <textarea
              className={inputCls + " h-32 py-1.5 font-mono resize-none"}
              value={p.argsJson}
              onChange={(e) => p.onArgsChange(e.target.value)}
              aria-label={t("mcp.argsLabel")}
              spellCheck={false}
            />
            <div>
              <Button variant="secondary" size="sm" onClick={p.onCall} disabled={p.busy}>
                {showSpinner && <Spinner />}
                {t("mcp.call")}
              </Button>
            </div>
            {p.callResult && (
              <pre className="text-3xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto rounded bg-[var(--color-bg)] border border-[var(--color-border)] p-2">
                {p.callResult}
              </pre>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
