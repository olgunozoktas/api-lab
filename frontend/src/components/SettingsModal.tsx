import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { THEMES, type Theme } from "../lib/types";
import { SUPPORTED_LOCALES, LOCALE_LABEL, type Locale } from "../lib/i18n";
import { APP_VERSION } from "../lib/changelog";
import { cn } from "../lib/cn";
import { BookOpen, ClockArrowUp, ExternalLink } from "lucide-react";

// =============================================================================
// SettingsModal — central place for appearance + request defaults +
// keyboard reference. Replaces the standalone theme-cycle button + the
// inline language picker that used to live in TopBar.
// =============================================================================

export type SettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const ui = useStore((s) => s.ui);
  const setUi = useStore((s) => s.setUi);
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);
  const defaults = useStore((s) => s.defaults);
  const setDefaults = useStore((s) => s.setDefaults);
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 py-4 border-b border-[var(--color-border)]">
          <DialogTitle className="text-base">{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-6">
          {/* ─── Appearance ─────────────────────────────────────────── */}
          <section aria-labelledby="settings-appearance">
            <h3
              id="settings-appearance"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
            >
              {t("settings.section.appearance")}
            </h3>
            <div className="space-y-3">
              <Field label={t("settings.theme")}>
                <div
                  role="radiogroup"
                  aria-label={t("settings.theme")}
                  className="flex flex-wrap gap-2"
                >
                  {THEMES.map((theme) => (
                    <ThemeSwatch
                      key={theme}
                      theme={theme}
                      label={t(`settings.theme.${theme}`)}
                      active={ui.theme === theme}
                      onSelect={() => setUi({ theme })}
                    />
                  ))}
                </div>
              </Field>

              <Field label={t("settings.language")}>
                <div role="radiogroup" aria-label={t("settings.language")} className="flex gap-2">
                  {SUPPORTED_LOCALES.map((code) => (
                    <Pill
                      key={code}
                      active={locale === code}
                      onClick={() => setLocale(code as Locale)}
                    >
                      {t(LOCALE_LABEL[code])}
                    </Pill>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          {/* ─── Request defaults ───────────────────────────────────── */}
          <section aria-labelledby="settings-defaults">
            <h3
              id="settings-defaults"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
            >
              {t("settings.section.defaults")}
            </h3>
            <div className="space-y-3">
              <Field label={t("settings.timeoutMs")}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1000}
                  max={600000}
                  step={1000}
                  value={defaults.timeoutMs}
                  onChange={(e) =>
                    setDefaults({ timeoutMs: Math.max(1000, Number(e.target.value) || 60000) })
                  }
                  className={cn(
                    "px-2 py-1 rounded-md border border-[var(--color-border)]",
                    "bg-[var(--color-bg)] text-[var(--color-fg)] text-sm",
                    "w-32"
                  )}
                />
              </Field>
              <Field label={t("settings.followRedirects")}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  value={defaults.followRedirects}
                  onChange={(e) =>
                    setDefaults({
                      followRedirects: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    })
                  }
                  className={cn(
                    "px-2 py-1 rounded-md border border-[var(--color-border)]",
                    "bg-[var(--color-bg)] text-[var(--color-fg)] text-sm",
                    "w-24"
                  )}
                />
              </Field>
              <Field label={t("settings.insecure")} layout="row">
                <input
                  type="checkbox"
                  checked={defaults.insecure}
                  onChange={(e) => setDefaults({ insecure: e.target.checked })}
                  className="cursor-pointer"
                  aria-label={t("settings.insecure")}
                />
              </Field>
            </div>
          </section>

          {/* ─── Keyboard reference ─────────────────────────────────── */}
          <section aria-labelledby="settings-shortcuts">
            <h3
              id="settings-shortcuts"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
            >
              {t("settings.section.shortcuts")}
            </h3>
            <ul className="text-xs text-[var(--color-fg)] space-y-1.5 grid grid-cols-2 gap-x-6">
              <Shortcut keys={["⌘", "↵"]} label={t("settings.shortcuts.send")} />
              <Shortcut keys={["⌘", "S"]} label={t("settings.shortcuts.save")} />
              <Shortcut keys={["⌘", "N"]} label={t("settings.shortcuts.new")} />
              <Shortcut keys={["⌘", "T"]} label={t("settings.shortcuts.tabNew")} />
              <Shortcut keys={["⌘", "W"]} label={t("settings.shortcuts.tabClose")} />
              <Shortcut keys={["⌘", "⇧", "T"]} label={t("settings.shortcuts.tabReopen")} />
              <Shortcut keys={["⌘", "1‒9"]} label={t("settings.shortcuts.tabJump")} />
              <Shortcut keys={["⌥", "⌘", "→/←"]} label={t("settings.shortcuts.tabCycle")} />
              <Shortcut keys={["⌘", "P"]} label={t("settings.shortcuts.switcher")} />
              <Shortcut keys={["⌘", "L"]} label={t("settings.shortcuts.focusUrl")} />
              <Shortcut keys={["⌘", "B"]} label={t("settings.shortcuts.toggleSidebar")} />
              <Shortcut keys={["⌘", "."]} label={t("settings.shortcuts.cancel")} />
              <Shortcut keys={["?"]} label={t("settings.shortcuts.openGuides")} />
            </ul>
          </section>

          {/* ─── About ────────────────────────────────────────────────── */}
          <section aria-labelledby="settings-about">
            <h3
              id="settings-about"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
            >
              {t("settings.section.about")}
            </h3>
            <AboutCard onClose={() => onOpenChange(false)} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// "About" surface — version, what API Lab is, where to go for help.
// The Guides / Changelog buttons dispatch window events that TopBar
// listens for, so this stays prop-light and the modal can close itself
// before the next one opens.
function AboutCard({ onClose }: { onClose: () => void }) {
  const t = useT();
  const fireAndClose = (eventName: string) => () => {
    onClose();
    // Run on the next tick so the Dialog finishes its exit animation
    // before the receiving modal mounts — avoids the brief "two open
    // dialogs" flash when transitioning.
    setTimeout(() => window.dispatchEvent(new CustomEvent(eventName)), 0);
  };
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-[3px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-purple)]" />
        <span className="font-semibold text-sm">{t("settings.about.name")}</span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]"
          aria-label={t("settings.about.versionAria", { version: APP_VERSION })}
        >
          v{APP_VERSION}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-[var(--color-fg-muted)]">
        {t("settings.about.tagline")}
      </p>
      <dl className="text-[11px] grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        <dt className="text-[var(--color-fg-muted)]">{t("settings.about.platform")}</dt>
        <dd className="font-mono">macOS</dd>
        <dt className="text-[var(--color-fg-muted)]">{t("settings.about.shell")}</dt>
        <dd className="font-mono">zero-native (Zig + WebKit)</dd>
        <dt className="text-[var(--color-fg-muted)]">{t("settings.about.frontend")}</dt>
        <dd className="font-mono">Vite + React 19 + Tailwind v4</dd>
        <dt className="text-[var(--color-fg-muted)]">{t("settings.about.storage")}</dt>
        <dd className="font-mono">{t("settings.about.storageLocal")}</dd>
      </dl>
      <div className="flex flex-wrap gap-2 pt-1">
        <AboutLink
          onClick={fireAndClose("apilab:open-guides")}
          icon={<BookOpen className="w-3 h-3" aria-hidden />}
        >
          {t("settings.about.openGuides")}
        </AboutLink>
        <AboutLink
          onClick={fireAndClose("apilab:open-changelog")}
          icon={<ClockArrowUp className="w-3 h-3" aria-hidden />}
        >
          {t("settings.about.openChangelog")}
        </AboutLink>
        <a
          href="https://github.com/olgunozoktas/api-lab"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--color-border)] text-[11px] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)] text-[var(--color-fg-muted)]"
        >
          {t("settings.about.repo")}
          <ExternalLink className="w-2.5 h-2.5 opacity-60" aria-hidden />
        </a>
      </div>
    </div>
  );
}

function AboutLink({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--color-border)] text-[11px] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)] text-[var(--color-fg-muted)]"
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  layout = "stack",
}: {
  label: string;
  children: React.ReactNode;
  layout?: "stack" | "row";
}) {
  return (
    <label
      className={cn(
        "block",
        layout === "row" ? "flex items-center justify-between gap-4" : "space-y-1"
      )}
    >
      <span className="text-xs text-[var(--color-fg-muted)]">{label}</span>
      <span>{children}</span>
    </label>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-md border text-xs",
        "transition-colors duration-100",
        active
          ? "bg-[var(--color-accent)]/15 border-[var(--color-accent)] text-[var(--color-fg)]"
          : "bg-transparent border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
      )}
    >
      {children}
    </button>
  );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex gap-0.5">
        {keys.map((k, i) => (
          <kbd key={i}>{k}</kbd>
        ))}
      </span>
      <span className="text-[var(--color-fg-muted)]">{label}</span>
    </li>
  );
}

// Compact theme swatch — shows the four key colors so the user can
// preview each theme without applying it. Click applies.
function ThemeSwatch({
  theme,
  label,
  active,
  onSelect,
}: {
  theme: Theme;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  // Hard-coded 4-color preview per theme (bg / bg-elev / fg / accent).
  // Mirrors the @theme values in main.css. Keeping this here rather than
  // computing from CSS variables means the preview is always accurate
  // even when the user is currently on a different theme.
  const palette: Record<Theme, [string, string, string, string]> = {
    auto: ["#1c1c1e", "#2c2c2e", "#f5f5f7", "#007aff"],
    light: ["#f5f5f7", "#ffffff", "#1d1d1f", "#007aff"],
    dark: ["#1c1c1e", "#2c2c2e", "#f5f5f7", "#007aff"],
    "tokyo-night": ["#1a1b26", "#24283b", "#c0caf5", "#7aa2f7"],
    "github-light": ["#ffffff", "#f6f8fa", "#1f2328", "#0969da"],
    "high-contrast": ["#000000", "#0a0a0a", "#ffffff", "#ffff00"],
  };
  const [bg, elev, fg, accent] = palette[theme];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-stretch w-[72px] rounded-md overflow-hidden",
        "border-2 transition-colors duration-100",
        active
          ? "border-[var(--color-accent)]"
          : "border-[var(--color-border)] hover:border-[var(--color-fg-muted)]"
      )}
    >
      <span
        className="h-7 grid place-items-center text-[10px]"
        style={{ background: bg, color: fg }}
        aria-hidden
      >
        Aa
      </span>
      <span className="flex h-3" aria-hidden>
        <span style={{ background: elev, flex: 1 }} />
        <span style={{ background: accent, flex: 1 }} />
      </span>
      <span className="text-[10px] py-1 text-center text-[var(--color-fg-muted)] bg-[var(--color-bg-elev)]">
        {label}
      </span>
    </button>
  );
}
