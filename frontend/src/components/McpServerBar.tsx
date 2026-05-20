/** Olgun Özoktaş geliştirdi · API Lab */
// URL-bar slot for MCP-mode tabs. The standard <UrlBarContainer>
// wants a typed primitive (URL); MCP servers are picked from a saved
// library instead, so this picker replaces the URL bar entirely when
// App.tsx routes to MCP mode. A "Manage" button opens the same
// McpServersModal the TopBar's icon does — same store backs both
// surfaces, only one is interactive at a time.
import { useState } from "react";
import { Save, Settings } from "lucide-react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { McpServersModal } from "./McpServersModal";

// Sentinel value for the "no server picked yet" select option — Radix
// Select rejects an empty-string value, so we use a marker the picker
// can map back to `serverId: null` when chosen.
const UNPICKED = "__none__";
// Sentinel for the "(deleted server)" placeholder shown when the saved
// `serverId` no longer exists in the library — picking it is a no-op,
// the user is expected to re-pick a real server.
const DELETED = "__deleted__";

export function McpServerBar() {
  const mcp = useStore((s) => s.current.mcp);
  const servers = useStore((s) => s.mcpServers);
  const setCurrent = useStore((s) => s.setCurrent);
  const saveCurrent = useStore((s) => s.saveCurrent);
  const t = useT();
  const [modalOpen, setModalOpen] = useState(false);

  // Three states the picker reflects:
  //   - no server picked yet  → UNPICKED placeholder
  //   - picked server still in the library  → that server's id
  //   - picked server was deleted from the library  → DELETED
  const referenced = mcp?.serverId ? servers.find((s) => s.id === mcp.serverId) : null;
  const value =
    mcp?.serverId === null || !mcp?.serverId ? UNPICKED : referenced ? referenced.id : DELETED;

  function onPick(next: string) {
    if (next === UNPICKED) {
      setCurrent({ mcp: { ...mcp!, serverId: null } });
      return;
    }
    if (next === DELETED) return; // Placeholder; never actually re-picked.
    setCurrent({ mcp: { ...mcp!, serverId: next } });
  }

  return (
    <div className="px-3 py-2 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center gap-2">
      <Select value={value} onValueChange={onPick}>
        <SelectTrigger className="flex-1" aria-label={t("mcp.requestPanel.selectServer")}>
          <SelectValue placeholder={t("mcp.requestPanel.selectServer")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNPICKED}>{t("mcp.requestPanel.selectServer")}</SelectItem>
          {servers.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
          {value === DELETED && (
            <SelectItem value={DELETED} disabled>
              {t("mcp.requestPanel.deletedServer")}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setModalOpen(true)}
        title={t("mcp.requestPanel.manageServers")}
      >
        <Settings className="w-3.5 h-3.5" />
        {t("mcp.requestPanel.manageServers")}
      </Button>
      {/* Visible Save mirrors ⌘S — the shortcut still works, the
          affordance is no longer hidden. saveCurrent itself derives
          an MCP-aware `<server> · <tool>` name from the snapshot
          when the tab is still on its placeholder label. */}
      <Button
        variant="primary"
        size="sm"
        onClick={() => saveCurrent()}
        title={t("mcp.request.save")}
      >
        <Save className="w-3.5 h-3.5" />
        {t("mcp.request.save")}
      </Button>
      <McpServersModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
