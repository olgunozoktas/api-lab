/** Olgun Özoktaş geliştirdi · API Lab */
// Top-of-window banner for sync state. A calm strip while a sync is
// in progress; a danger banner when the sync engine parks `syncStatus`
// at `conflict` or `error`. A conflict offers the coarse Keep-local /
// Take-remote resolution; an error is dismissible.
import { AlertTriangle, X } from "lucide-react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { runResolve } from "../lib/syncEngine";

export function SyncBanner() {
  const t = useT();
  const status = useStore((s) => s.syncStatus);
  const setSyncStatus = useStore((s) => s.setSyncStatus);

  // Sync in progress — a calm, non-alarming strip with a spinner.
  if (status.state === "syncing") {
    return (
      <div className="flex flex-shrink-0 items-center gap-2 bg-[var(--color-bg-elev-2)] px-3 py-1.5 text-2xs text-[var(--color-fg-muted)]">
        <Spinner />
        <span>{t("sync.syncing.banner")}</span>
      </div>
    );
  }

  if (status.state !== "conflict" && status.state !== "error") return null;
  const isConflict = status.state === "conflict";

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-[var(--color-danger)] text-white text-xs flex-shrink-0">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">
        {isConflict
          ? t("sync.conflict.banner")
          : t("sync.error.banner", { message: status.message || "?" })}
      </span>
      {isConflict && (
        <>
          <Button variant="secondary" size="sm" onClick={() => void runResolve("local")}>
            {t("sync.conflict.keepLocal")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void runResolve("remote")}>
            {t("sync.conflict.takeRemote")}
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("sync.dismiss")}
        title={t("sync.dismiss")}
        onClick={() => setSyncStatus({ state: "idle", message: "" })}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
