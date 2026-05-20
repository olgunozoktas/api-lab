/** Olgun Özoktaş geliştirdi · API Lab */
// Library modal for managed MCP server configs. Replaces the old
// one-shot McpPanel TopBar modal: this one is pure CRUD over the
// `mcpServers` slice — every tool call lives in a request tab and
// references a server by id. Local-state edit + explicit save mirrors
// EnvEditorModal so cancelling a session of edits never half-writes.
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { uid } from "../lib/utils";
import { bridge } from "../lib/bridge";
import type { McpServerConfig, McpTransport } from "../lib/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { McpServerRow } from "./McpServerRow";

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

  // Re-sync the local buffer from the store every time the modal
  // opens. TopBar mounts <McpServersModal> unconditionally (only the
  // inner DialogContent flips with `open`), so the lazy useState
  // initializer above only fires ONCE — at app launch. Without this
  // effect, a row added between opens (e.g. by enabling a `kind: "mcp"`
  // integration from the Integrations gallery) never appears in the
  // modal's list, even though it's correctly in the store. Resetting
  // editingId at the same time clears any stale in-flight edits from
  // a previous unsaved session.
  useEffect(() => {
    if (!open) return;
    setLocal(JSON.parse(JSON.stringify(useStore.getState().mcpServers)));
    setEditingId(null);
  }, [open]);

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
  // entries are dropped (probably abandoned mid-edit). Integration-
  // provided servers in the local buffer are dropped from the write
  // path and replaced with the LIVE store list — so a Save here
  // never clobbers an integration that was enabled / refreshed in
  // another window after this modal opened.
  function commit(): McpServerConfig[] {
    const live = useStore.getState().mcpServers.filter((m) => !!m.integrationId);
    const userEdited = servers
      .filter((m) => !m.integrationId)
      .map((s) => ({ ...s, name: s.name.trim() }))
      .filter((s) => s.name.length > 0);
    const next = [...live, ...userEdited];
    setMcpServers(next);
    return next;
  }

  function save() {
    commit();
    showToast(t("mcp.servers.saved"), { severity: "success" });
    onOpenChange(false);
  }

  // Open-in-tab also commits pending edits — otherwise the new tab
  // would reference an unsaved server, which is confusing.
  function openInTab(serverId: string) {
    const next = commit();
    if (!next.some((s) => s.id === serverId)) {
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
