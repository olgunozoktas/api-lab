/** Olgun Özoktaş geliştirdi · API Lab */
// One row in the MCP servers library modal. Extracted from
// McpServersModal.tsx because the integration-provided treatment +
// per-row Refresh button push the inline row well past what fits in
// the parent file (which would otherwise blow the 400-LOC cap).
//
// Two row modes are rendered from the same component:
//   - user-added (no integrationId) — Edit / Delete / Open-in-tab /
//     Refresh available. Refresh = list tools → cache → toast.
//   - integration-provided (integrationId set) — "Integration" badge
//     replaces Edit + Delete; the row is read-only here, removal
//     happens by disabling the integration. Refresh = re-apply the
//     current registry definition (so an app-version update can land
//     a new URL or name) then list tools → cache → toast.
import { useState } from "react";
import { Pencil, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { bridge } from "../lib/bridge";
import type { McpServerConfig } from "../lib/types";
import { mcpListTools } from "../lib/mcp";
import { findIntegration } from "../lib/integrations/registry";
import { useMcpToolsCache } from "../store/mcpToolsCache";
import { useDelayedFlag } from "../lib/useDelayedFlag";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Spinner } from "./ui/spinner";
import { McpServerForm } from "./McpServerForm";

export interface McpServerRowProps {
  server: McpServerConfig;
  editing: boolean;
  summary: string;
  onUpdate: (patch: Partial<McpServerConfig>) => void;
  onToggleEdit: () => void;
  onRemove: () => void;
  onOpenInTab: () => void;
}

export function McpServerRow({
  server,
  editing,
  summary,
  onUpdate,
  onToggleEdit,
  onRemove,
  onOpenInTab,
}: McpServerRowProps) {
  const t = useT();
  const showToast = useStore((s) => s.showToast);
  const installFromIntegration = useStore((s) => s.installMcpServerFromIntegration);
  const isIntegration = !!server.integrationId;

  const [refreshing, setRefreshing] = useState(false);
  const showSpinner = useDelayedFlag(refreshing);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      // Integration-provided rows pull the current registry def first
      // so a registry change shipped with a new app version lands the
      // moment the user hits Refresh. User-added rows just hit the
      // wire with whatever transport the user already configured.
      let transport = server.transport;
      if (isIntegration) {
        const def = findIntegration(server.integrationId!);
        if (def && def.fetch.kind === "mcp") {
          installFromIntegration(def.id, def.name, def.fetch.transport, def.description);
          transport = def.fetch.transport;
        }
      }
      const res = await mcpListTools(transport);
      if (res.ok) {
        useMcpToolsCache.getState().setCached(server.id, res.value);
        showToast(
          t("mcp.servers.refreshOk", { name: server.name, count: String(res.value.length) }),
          { severity: "success" }
        );
      } else {
        showToast(t("mcp.servers.refreshFailed", { name: server.name, error: res.error }), {
          severity: "error",
        });
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate">
              {server.name || t("mcp.servers.unnamed")}
            </span>
            {isIntegration && (
              <Badge tone="accent" size="sm" title={t("mcp.servers.integrationLocked")}>
                {t("mcp.servers.integrationBadge")}
              </Badge>
            )}
          </div>
          <div className="text-3xs font-mono text-[var(--color-fg-muted)] truncate">{summary}</div>
          {server.description && (
            <div className="text-2xs text-[var(--color-fg-muted)] mt-1">{server.description}</div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenInTab}
            title={t("mcp.servers.openInTab")}
            aria-label={t("mcp.servers.openInTab")}
            disabled={!server.name.trim()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleRefresh()}
            title={t("mcp.servers.refresh")}
            aria-label={t("mcp.servers.refresh")}
            disabled={refreshing || !server.name.trim()}
          >
            {showSpinner ? <Spinner /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
          {/* Integration-provided servers are managed from the
              integrations gallery — direct Edit/Delete are locked
              so the registry stays the source of truth. */}
          {!isIntegration && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleEdit}
                aria-label={t("mcp.servers.edit")}
                aria-pressed={editing}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                aria-label={t("mcp.servers.delete")}
              >
                <Trash2 className="w-3.5 h-3.5 text-[var(--color-danger)]" />
              </Button>
            </>
          )}
        </div>
      </div>
      {editing && !isIntegration && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
          <McpServerForm
            value={{
              name: server.name,
              transport: server.transport,
              description: server.description,
            }}
            onChange={(patch) => onUpdate(patch as Partial<McpServerConfig>)}
            stdioAvailable={bridge.available}
          />
        </div>
      )}
    </div>
  );
}
