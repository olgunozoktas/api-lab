/** Olgun Özoktaş geliştirdi · API Lab */
import { useStore } from "../store";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { EnvEditorModal } from "./EnvEditorModal";
import { SettingsModal } from "./SettingsModal";
import { MockControlPanel } from "./MockControlPanel";
import { ResponseDiffModal } from "./ResponseDiffModal";
import { IntegrationsModal } from "./IntegrationsModal";
import { McpServersModal } from "./McpServersModal";
import { useChangelogAutoOpen } from "../lib/changelog_gate";
import { APP_VERSION, formatBuildDate } from "../lib/changelog";
import { useUpdateCheck } from "../lib/updateCheck";
import { useGuideShortcut } from "../lib/guides_shortcut";
import { useSettingsShortcut } from "../lib/settings_shortcut";
import { useEnvEditorShortcut } from "../lib/env_editor_shortcut";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { IconButton } from "./ui/icon-button";
import { KbdHint } from "./ui/kbd-hint";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Boxes,
  Download,
  GitCompare,
  HelpCircle,
  History,
  Plug,
  Server,
  Settings,
  Settings2,
} from "lucide-react";

// The changelog + guide modals are opened on demand and each pulls in
// a glob of markdown content (changelogEntries.ts / guides.ts). Lazy-
// load them so that prose corpus lands in an async chunk, not the
// first-paint bundle. The version-gate (useChangelogAutoOpen) stays
// eager — it's cheap; only the modal body is deferred.
const ChangelogModal = lazy(() =>
  import("./ChangelogModal").then((m) => ({ default: m.ChangelogModal }))
);
const GuideHub = lazy(() => import("./GuideHub").then((m) => ({ default: m.GuideHub })));

export function TopBar() {
  const envs = useStore((s) => s.envs);
  const activeEnv = useStore((s) => s.activeEnv);
  const setActiveEnv = useStore((s) => s.setActiveEnv);
  const t = useT();
  const [editingEnv, setEditingEnv] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [mockOpen, setMockOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  // Optional seeds for ResponseDiffModal — set by the "Compare with…"
  // context-menu entries in HistoryList + TabStrip via the
  // `apilab:open-diff` window event (see effect below). Cleared
  // every time the modal closes so the next TopBar-button open
  // returns to the seedless flow.
  const [diffSeed, setDiffSeed] = useState<{ leftId?: string; rightId?: string }>({});
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  // Launch-time GitHub-release check. Non-null only when a newer
  // release exists; renders a small "Update" pill next to the version.
  const update = useUpdateCheck();
  // Changelog auto-opens on first launch when APP_VERSION > lastSeen.
  // The hook handles the markSeen side-effect; we just bind the open
  // state and surface a manual-open button below.
  const { open: changelogOpen, setOpen: setChangelogOpen } = useChangelogAutoOpen();
  // `?` opens the guide hub from anywhere (skips when focus is in an
  // editable element so users can still type "?" into URLs / bodies).
  const openGuide = useCallback(() => setGuideOpen(true), []);
  useGuideShortcut(openGuide);
  // ⌘+, → open Settings (macOS standard for Preferences). Works
  // anywhere, including while typing in inputs, since the keystroke
  // never produces a useful character.
  const openSettings = useCallback(() => setEditingSettings(true), []);
  useSettingsShortcut(openSettings);
  // ⌘+Shift+E → open Environments editor. Shift-prefixed to dodge
  // WebKit-native ⌘+E ("Use Selection for Find") in text fields.
  const openEnvEditor = useCallback(() => setEditingEnv(true), []);
  useEnvEditorShortcut(openEnvEditor);
  // `apilab:open-diff` — dispatched from HistoryList / TabStrip
  // context menus with an optional `{leftId, rightId}` payload so
  // those surfaces can pre-seed the modal without prop-drilling.
  // Matches the existing `apilab:focus-url` / `apilab:run-collection`
  // window-event pattern.
  useEffect(() => {
    const onOpenDiff = (e: Event) => {
      const detail = (e as CustomEvent<{ leftId?: string; rightId?: string }>).detail ?? {};
      setDiffSeed({ leftId: detail.leftId, rightId: detail.rightId });
      setDiffOpen(true);
    };
    window.addEventListener("apilab:open-diff", onOpenDiff);
    return () => window.removeEventListener("apilab:open-diff", onOpenDiff);
  }, []);

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
          <button
            type="button"
            onClick={() => setChangelogOpen(true)}
            className="text-3xs font-mono font-normal px-1.5 py-0.5 rounded bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] transition-colors cursor-pointer"
            title={(() => {
              const built = formatBuildDate();
              const hint = t("topbar.version.clickHint");
              const base = built
                ? `v${APP_VERSION}\n${t("topbar.builtAt", { date: built })}`
                : `v${APP_VERSION}`;
              return `${base}\n\n${hint}`;
            })()}
            aria-label={t("topbar.version.clickHint")}
          >
            v{APP_VERSION}
          </button>
          {update && (
            <a
              href={update.url}
              target="_blank"
              rel="noreferrer"
              className="text-3xs font-medium px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity inline-flex items-center gap-1 no-underline"
              title={t("topbar.updateAvailable", { version: update.latestVersion })}
            >
              <Download className="w-3 h-3" />
              {t("topbar.update")}
            </a>
          )}
        </div>
        <div className="flex-1" />

        {/* Hide the env switcher when there's only one env — a solo
            "default" dropdown is visual noise. The Env... button stays
            visible so users can still discover and create more. A small
            read-only badge with the single env's name + var count fills
            the "which env is active?" gap that the hidden dropdown
            leaves behind. */}
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
                        className="text-3xs font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]"
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
        ) : (
          <SingleEnvBadge />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditingEnv(true)}
          title={t("topbar.envEdit") + "  ⌘⇧E"}
        >
          <Settings2 className="w-3.5 h-3.5" />
          {t("topbar.envEdit")}
          <KbdHint>⌘ ⇧ E</KbdHint>
        </Button>
        {/* Icon-only actions — each wrapped in a styled Tooltip so the
            feature is discoverable on hover, not a mystery glyph. */}
        <IconButton
          onClick={() => setMockOpen(true)}
          aria-label={t("topbar.mock")}
          tooltip={t("topbar.mock")}
          icon={<Server className="w-3.5 h-3.5" />}
        />
        <IconButton
          onClick={() => setDiffOpen(true)}
          aria-label={t("topbar.diff")}
          tooltip={t("topbar.diff")}
          icon={<GitCompare className="w-3.5 h-3.5" />}
        />
        <IconButton
          onClick={() => setIntegrationsOpen(true)}
          aria-label={t("topbar.integrations")}
          tooltip={t("topbar.integrations")}
          icon={<Plug className="w-3.5 h-3.5" />}
        />
        <IconButton
          onClick={() => setMcpOpen(true)}
          aria-label={t("topbar.mcp")}
          tooltip={t("topbar.mcp")}
          icon={<Boxes className="w-3.5 h-3.5" />}
        />
        <IconButton
          onClick={() => setGuideOpen(true)}
          aria-label={t("topbar.guides")}
          tooltip={
            <span className="inline-flex items-center">
              {t("topbar.guides")}
              <KbdHint>?</KbdHint>
            </span>
          }
          icon={<HelpCircle className="w-3.5 h-3.5" />}
        />
        <IconButton
          onClick={() => setChangelogOpen(true)}
          aria-label={t("topbar.changelog")}
          tooltip={t("topbar.changelog")}
          icon={<History className="w-3.5 h-3.5" />}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditingSettings(true)}
          aria-label={t("topbar.settings")}
          title={t("topbar.settings") + "  ⌘,"}
        >
          <Settings className="w-3.5 h-3.5" />
          {t("topbar.settings")}
          <KbdHint>⌘ ,</KbdHint>
        </Button>
      </header>
      {editingEnv && <EnvEditorModal open onOpenChange={(o) => !o && setEditingEnv(false)} />}
      <SettingsModal open={editingSettings} onOpenChange={setEditingSettings} />
      {/* Mounted only once open — keeps the lazy chunk (and its
          markdown glob) off first paint until the modal is needed. */}
      {changelogOpen && (
        <Suspense fallback={null}>
          <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} />
        </Suspense>
      )}
      {guideOpen && (
        <Suspense fallback={null}>
          <GuideHub open={guideOpen} onOpenChange={setGuideOpen} />
        </Suspense>
      )}
      <MockControlPanel open={mockOpen} onOpenChange={setMockOpen} />
      <ResponseDiffModal
        open={diffOpen}
        onOpenChange={(o) => {
          setDiffOpen(o);
          // Drop the seeds once the modal closes so a subsequent
          // TopBar-button open starts with the default
          // sources[0]/sources[1] picks rather than a stale seed.
          if (!o) setDiffSeed({});
        }}
        initialLeftId={diffSeed.leftId ?? null}
        initialRightId={diffSeed.rightId ?? null}
      />
      <IntegrationsModal open={integrationsOpen} onOpenChange={setIntegrationsOpen} />
      <McpServersModal open={mcpOpen} onOpenChange={setMcpOpen} />
    </>
  );
}

// Read-only badge shown in place of the env switcher when only one
// env exists. Surfaces both the env name and its var count so the
// user knows what {{var}} substitutions will resolve against — the
// hidden-dropdown state was previously a blind spot.
function SingleEnvBadge() {
  const envs = useStore((s) => s.envs);
  const activeEnv = useStore((s) => s.activeEnv);
  const t = useT();
  const active = envs.find((e) => e.id === activeEnv) ?? envs[0];
  if (!active) return null;
  const count = Object.keys(active.vars).length;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-2xs text-[var(--color-fg-muted)] px-2 py-1 rounded bg-[var(--color-bg-elev-2)]"
      aria-label={t("topbar.activeEnv", { name: active.name })}
      title={t("topbar.activeEnv", { name: active.name })}
    >
      <span>{active.name}</span>
      <span
        className="text-3xs font-mono px-1 py-0 rounded bg-[var(--color-bg)] text-[var(--color-fg-muted)]"
        aria-label={t("env.varCount", { n: String(count) })}
      >
        {t("env.varCountShort", { n: String(count) })}
      </span>
    </span>
  );
}
