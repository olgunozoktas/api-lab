/** Olgun Özoktaş geliştirdi · API Lab */
import { CheckCircle2, XCircle, AlertTriangle, Info, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { ToastEntry, ToastSeverity } from "../lib/toast";
import { cn } from "../lib/cn";
import { useT } from "../lib/i18n/useT";

// Per-severity icon + accent colour token. `info` borrows the accent
// colour; the rest map to their semantic `--color-*` tokens.
const SEVERITY: Record<ToastSeverity, { icon: LucideIcon; color: string }> = {
  success: { icon: CheckCircle2, color: "var(--color-success)" },
  error: { icon: XCircle, color: "var(--color-danger)" },
  warning: { icon: AlertTriangle, color: "var(--color-warning)" },
  info: { icon: Info, color: "var(--color-accent)" },
};

// Exit-animation duration — the store removal is deferred this long so
// the slide/fade-out can play before the node unmounts.
const EXIT_MS = 180;

interface ToastItemProps {
  toast: ToastEntry;
  onDismiss: (id: string) => void;
}

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const { icon: Icon, color } = SEVERITY[toast.severity];

  function beginExit() {
    setLeaving(true);
    window.setTimeout(() => onDismiss(toast.id), EXIT_MS);
  }

  // Auto-dismiss after the toast's own duration. Runs once per mount;
  // `beginExit` is stable enough for this lifecycle-scoped timer.
  useEffect(() => {
    const timer = window.setTimeout(beginExit, toast.duration);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-lg border py-2 pr-2 pl-3 text-xs shadow-lg",
        "border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-fg)]",
        leaving
          ? "animate-out fade-out-0 slide-out-to-bottom-2"
          : "animate-in fade-in-0 slide-in-from-bottom-2"
      )}
      style={{ borderLeftColor: color, borderLeftWidth: "3px" }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden />
      <span className="min-w-0 break-words">{toast.msg}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onAction();
            beginExit();
          }}
          className="ml-1 shrink-0 font-medium text-[var(--color-accent)] hover:underline"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={beginExit}
        aria-label={t("toast.dismiss")}
        className={cn(
          "ml-1 shrink-0 rounded p-0.5 text-[var(--color-fg-muted)]",
          "hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]"
        )}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
