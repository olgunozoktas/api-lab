/** Olgun Özoktaş geliştirdi · API Lab */
import { useStore } from "../store";
import { useCallback, useEffect, useState } from "react";
import { EnvEditorModal } from "./EnvEditorModal";
import { SettingsModal } from "./SettingsModal";
import { ChangelogModal } from "./ChangelogModal";
import { GuideHub } from "./GuideHub";
import { useChangelogAutoOpen } from "../lib/changelog_gate";
import { APP_VERSION, formatBuildDate } from "../lib/changelog";
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

  // Window-event channels so anywhere in the app (e.g. the About
  // section in SettingsModal) can ask for these modals without
  // prop-drilling through the tree. TopBar owns the open state, so
  // it's the single listener.
  useEffect(() => {
    const onGuides = () => {
      setEditingSettings(false);
      setGuideOpen(true);
    };
    const onChangelog = () => {
      setEditingSettings(false);
      setChangelogOpen(true);
    };
    window.addEventListener("apilab:open-guides", onGuides);
    window.addEventListener("apilab:open-changelog", onChangelog);
    return () => {
      window.removeEventListener("apilab:open-guides", onGuides);
      window.removeEventListener("apilab:open-changelog", onChangelog);
    };
  }, [setChangelogOpen]);

  return (
    <>
      <header className="h-11 bg-[var(--color-bg-elev)] border-b border-[var(--color-border)] flex items-center px-3 gap-2 flex-shrink-0">
        <div className="font-semibold text-sm flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-purple)]" />
          API Lab
          <span
            className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)] cursor-help"
            title={(() => {
              const built = formatBuildDate();
              return built
                ? `v${APP_VERSION}\n${t("topbar.builtAt", { date: built })}`
                : `v${APP_VERSION}`;
            })()}
          >
            v{APP_VERSION}
          </span>
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
              {envs.map((e) => {
                const count = Object.keys(e.vars).length;
                return (
                  <SelectItem key={e.id} value={e.id}>
                    <span className="inline-flex items-center gap-2">
                      <span>{e.name}</span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]"
                        aria-label={t("env.varCount", { n: String(count) })}
                      >
                        {t("env.varCountShort", { n: String(count) })}
                      </span>
                    </span>
                  </SelectItem>
                );
              })}
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
