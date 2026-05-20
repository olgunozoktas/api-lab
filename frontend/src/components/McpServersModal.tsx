/** Olgun Özoktaş geliştirdi · API Lab */
// Library modal for managed MCP server configs. Replaces the old
// one-shot McpPanel TopBar modal: this one is pure CRUD over the
// `mcpServers` slice — every tool call lives in a request tab and
// references a server by id. Local-state edit + explicit save mirrors
// EnvEditorModal so cancelling a session of edits never half-writes.
import { useState } from "react";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { uid } from "../lib/utils";
import { bridge } from "../lib/bridge";
import type { McpServerConfig, McpTransport } from "../lib/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { McpServerForm } from "./McpServerForm";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

// One-line preview rendered when a server row is collapsed — the user
// can scan their library without expanding each card.
function transportSummary(tr: McpTransport): string {
  return tr.kind === "stdio"
    ? `stdio: ${tr.command}${tr.args.length ? " " + tr.args.join(" ") : ""}`
    : `http: ${tr.url || "—"}`;
}

export function McpServersModal({ open, onOpenChange }: Props) {
  const initial = useStore((s) => s.mcpServers);
  const setMcpServers = useStore((s) => s.setMcpServers);
  const addRequestFromMcpServer = useStore((s) => s.addRequestFromMcpServer);
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  // Buffer edits locally so closing the modal without "Save" reverts
  // every pending change — same pattern EnvEditorModal uses.
  const [servers, setLocal] = useState<McpServerConfig[]>(() =>
    JSON.parse(JSON.stringify(initial))
  );
  // Only one row expanded at a time keeps the modal short.
  const [editingId, setEditingId] = useState<string | null>(null);

  function add() {
    // Default to stdio when the bridge is reachable, http otherwise —
    // matches what the user can actually run from this context.
    const fresh: McpServerConfig = {
      id: uid(),
      name: t("mcp.servers.defaultName"),
      transport: bridge.available
        ? { kind: "stdio", command: "npx", args: [] }
        : { kind: "http", url: "" },
    };
    setLocal((ls) => [...ls, fresh]);
    setEditingId(fresh.id);
  }

  function update(id: string, patch: Partial<McpServerConfig>) {
    setLocal((ls) => ls.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function remove(id: string) {
    setLocal((ls) => ls.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
  }

  // Commit edits to the store and close. Names are trimmed; nameless
  // entries are dropped (probably abandoned mid-edit).
  function save() {
    const cleaned = servers
      .map((s) => ({ ...s, name: s.name.trim() }))
      .filter((s) => s.name.length > 0);
    setMcpServers(cleaned);
    showToast(t("mcp.servers.saved"), { severity: "success" });
    onOpenChange(false);
  }

  // Open-in-tab also commits pending edits — otherwise the new tab
  // would reference an unsaved server, which is confusing.
  function openInTab(serverId: string) {
    const cleaned = servers
      .map((s) => ({ ...s, name: s.name.trim() }))
      .filter((s) => s.name.length > 0);
    setMcpServers(cleaned);
    if (!cleaned.some((s) => s.id === serverId)) {
      showToast(t("mcp.servers.nameRequired"), { severity: "warning" });
      return;
    }
    addRequestFromMcpServer(serverId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("mcp.servers.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {servers.length === 0 ? (
            <EmptyState size="compact" title={t("mcp.servers.empty")} />
          ) : (
            servers.map((s) => (
              <McpServerRow
                key={s.id}
                server={s}
                editing={editingId === s.id}
                summary={transportSummary(s.transport)}
                onUpdate={(patch) => update(s.id, patch)}
                onToggleEdit={() => setEditingId(editingId === s.id ? null : s.id)}
                onRemove={() => remove(s.id)}
                onOpenInTab={() => openInTab(s.id)}
              />
            ))
          )}
          <Button variant="dashed" size="md" className="w-full" onClick={add}>
            {t("mcp.servers.add")}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="primary" onClick={save}>
            {t("composer.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RowProps {
  server: McpServerConfig;
  editing: boolean;
  summary: string;
  onUpdate: (patch: Partial<McpServerConfig>) => void;
  onToggleEdit: () => void;
  onRemove: () => void;
  onOpenInTab: () => void;
}

function McpServerRow({
  server,
  editing,
  summary,
  onUpdate,
  onToggleEdit,
  onRemove,
  onOpenInTab,
}: RowProps) {
  const t = useT();
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">
            {server.name || t("mcp.servers.unnamed")}
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
        </div>
      </div>
      {editing && (
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
