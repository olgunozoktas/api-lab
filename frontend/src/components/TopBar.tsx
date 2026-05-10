import { useStore } from "../store";
import { useCallback, useState } from "react";
import { EnvEditorModal } from "./EnvEditorModal";
import { SettingsModal } from "./SettingsModal";
import { ChangelogModal } from "./ChangelogModal";
import { GuideHub } from "./GuideHub";
import { useChangelogAutoOpen } from "../lib/changelog_gate";
import { useGuideShortcut } from "../lib/guides_shortcut";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { HelpCircle, History, Settings, Settings2 } from "lucide-react";

export function TopBar() {
  const envs = useStore((s) => s.envs);
  const activeEnv = useStore((s) => s.activeEnv);
  const setActiveEnv = useStore((s) => s.setActiveEnv);
  const t = useT();
  const [editingEnv, setEditingEnv] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  // Changelog auto-opens on first launch when APP_VERSION > lastSeen.
  // The hook handles the markSeen side-effect; we just bind the open
  // state and surface a manual-open button below.
  const { open: changelogOpen, setOpen: setChangelogOpen } = useChangelogAutoOpen();
  // `?` opens the guide hub from anywhere (skips when focus is in an
  // editable element so users can still type "?" into URLs / bodies).
  const openGuide = useCallback(() => setGuideOpen(true), []);
  useGuideShortcut(openGuide);

  return (
    <>
      <header className="h-11 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center px-3 gap-2 flex-shrink-0">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-purple)]" />
          API Lab
        </div>
        <div className="flex-1" />

        {/* Hide the env switcher when there's only one env — a solo
            "default" dropdown is visual noise. The Env... button stays
            visible so users can still discover and create more. */}
        {envs.length > 1 ? (
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
        ) : null}

        <Button variant="ghost" size="sm" onClick={() => setEditingEnv(true)}>
          <Settings2 className="w-3.5 h-3.5" />
          {t("topbar.envEdit")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setGuideOpen(true)}
          aria-label={t("topbar.guides")}
          title={t("topbar.guides")}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setChangelogOpen(true)}
          aria-label={t("topbar.changelog")}
          title={t("topbar.changelog")}
        >
          <History className="w-3.5 h-3.5" />
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
      <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} />
      <GuideHub open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
