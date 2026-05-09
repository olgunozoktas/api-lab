import { useStore } from "../store";
import { useState } from "react";
import { EnvEditorModal } from "./EnvEditorModal";
import { SettingsModal } from "./SettingsModal";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Settings, Settings2 } from "lucide-react";

export function TopBar() {
  const envs = useStore((s) => s.envs);
  const activeEnv = useStore((s) => s.activeEnv);
  const setActiveEnv = useStore((s) => s.setActiveEnv);
  const t = useT();
  const [editingEnv, setEditingEnv] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);

  return (
    <>
      <header className="h-11 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center px-3 gap-2 flex-shrink-0">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-purple)]" />
          API Lab
        </div>
        <div className="flex-1" />

        <Select value={activeEnv} onValueChange={setActiveEnv}>
          <SelectTrigger aria-label={t("topbar.envSelect")} className="w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {envs.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={() => setEditingEnv(true)}>
          <Settings2 className="w-3.5 h-3.5" />
          {t("topbar.envEdit")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditingSettings(true)}
          aria-label={t("topbar.settings")}
        >
          <Settings className="w-3.5 h-3.5" />
          {t("topbar.settings")}
        </Button>
      </header>
      {editingEnv && <EnvEditorModal open onOpenChange={(o) => !o && setEditingEnv(false)} />}
      <SettingsModal open={editingSettings} onOpenChange={setEditingSettings} />
    </>
  );
}
