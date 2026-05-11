import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { THEMES, type Theme } from "../lib/types";
import { SUPPORTED_LOCALES, LOCALE_LABEL, type Locale } from "../lib/i18n";
import { cn } from "../lib/cn";

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
              <Shortcut keys={["⌘", "P"]} label={t("settings.shortcuts.switcher")} />
              <Shortcut keys={["⌘", "L"]} label={t("settings.shortcuts.focusUrl")} />
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
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
