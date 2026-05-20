/** Olgun Özoktaş geliştirdi · API Lab */
// Shared low-level UI used by every settings section. Lives here (not
// inside any specific section file) so adding a new section never
// duplicates these primitives — the cost of inline copies was the
// pressure that pushed `SettingsModal.tsx` over its 400-LOC cap.
import { cn } from "../../lib/cn";
import type { Theme } from "../../lib/types";

export function Field({
  label,
  hint,
  children,
  layout = "stack",
}: {
  label: string;
  // Optional one-line description rendered under the input (or
  // under the label-row in `row` layout). Keeps explainer text
  // co-located with the control instead of pushing users to docs.
  hint?: string;
  children: React.ReactNode;
  layout?: "stack" | "row";
}) {
  if (layout === "row") {
    return (
      <div>
        <label className="flex items-center justify-between gap-4">
          <span className="text-xs text-[var(--color-fg-muted)]">{label}</span>
          <span>{children}</span>
        </label>
        {hint && (
          <p className="text-2xs text-[var(--color-fg-muted)] leading-relaxed mt-1">{hint}</p>
        )}
      </div>
    );
  }
  return (
    <label className="block space-y-1">
      <span className="text-xs text-[var(--color-fg-muted)]">{label}</span>
      <span className="block">{children}</span>
      {hint && (
        <span className="block text-2xs text-[var(--color-fg-muted)] leading-relaxed">{hint}</span>
      )}
    </label>
  );
}

export function Pill({
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

export function Shortcut({ keys, label }: { keys: string[]; label: string }) {
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
export function ThemeSwatch({
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
        className="h-7 grid place-items-center text-3xs"
        style={{ background: bg, color: fg }}
        aria-hidden
      >
        Aa
      </span>
      <span className="flex h-3" aria-hidden>
        <span style={{ background: elev, flex: 1 }} />
        <span style={{ background: accent, flex: 1 }} />
      </span>
      <span className="text-3xs py-1 text-center text-[var(--color-fg-muted)] bg-[var(--color-bg-elev)]">
        {label}
      </span>
    </button>
  );
}

// Small numeric tile for the "Your data" block — large value on top,
// muted label below. All five tiles share the same min-width via the
// parent grid so the row stays visually balanced.
export function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-center">
      <div className="text-sm font-mono tabular-nums text-[var(--color-fg)]">{value}</div>
      <div className="text-3xs text-[var(--color-fg-muted)] mt-0.5">{label}</div>
    </div>
  );
}
