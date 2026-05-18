/** Olgun Özoktaş geliştirdi · API Lab */
// First-run onboarding — a single dismissable card shown on a fresh
// install. Deliberately NOT a multi-step tour: one card, one dismiss.
// The dismissal persists via the `ui.firstRunDismissed` flag (IDB),
// so it never re-appears after the user closes it.
import { Sparkles, X } from "lucide-react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";

// Presenter — pure: takes the dismiss callback.
export type FirstRunCardProps = {
  onDismiss: () => void;
};

export function FirstRunCard({ onDismiss }: FirstRunCardProps) {
  const t = useT();
  return (
    <div className="relative w-full max-w-md rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 px-4 py-3.5 text-left">
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("firstRun.dismiss")}
        className="absolute right-2 top-2 p-1 rounded text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)] transition-colors"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="w-4 h-4 text-[var(--color-accent)]" aria-hidden />
        <h3 className="text-xs font-semibold text-[var(--color-fg)]">{t("firstRun.title")}</h3>
      </div>
      <p className="text-2xs text-[var(--color-fg-muted)] leading-relaxed mb-2.5">
        {t("firstRun.body")}
      </p>
      <Button variant="primary" size="sm" onClick={onDismiss}>
        {t("firstRun.cta")}
      </Button>
    </div>
  );
}

// Container — wires the persisted dismissal flag. Renders nothing once
// the card has been dismissed.
export function FirstRunCardContainer() {
  const dismissed = useStore((s) => s.ui.firstRunDismissed);
  const setUi = useStore((s) => s.setUi);
  if (dismissed) return null;
  return <FirstRunCard onDismiss={() => setUi({ firstRunDismissed: true })} />;
}
