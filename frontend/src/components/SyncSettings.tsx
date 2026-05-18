/** Olgun Özoktaş geliştirdi · API Lab */
// Collection-sync settings section, rendered inside the Settings
// modal. Configure the git remote, run the initial clone, sync now,
// or turn sync off. Extracted into its own component so the new
// feature does not grow the already-large SettingsModal.
import { useState } from "react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { Button } from "./ui/button";
import { syncSetup, syncErrorText } from "../lib/gitSync";
import { runManualSync } from "../lib/syncEngine";

const inputCls =
  "w-full bg-[var(--color-bg-elev)] border border-[var(--color-border)] rounded " +
  "px-2 py-1 font-mono text-xs outline-none focus:border-[var(--color-accent)] " +
  "text-[var(--color-fg)]";

export function SyncSettings() {
  const t = useT();
  const syncConfig = useStore((s) => s.syncConfig);
  const syncStatus = useStore((s) => s.syncStatus);
  const setSyncConfig = useStore((s) => s.setSyncConfig);
  const setSyncStatus = useStore((s) => s.setSyncStatus);
  const [busy, setBusy] = useState(false);

  const setUp = async () => {
    if (busy || !syncConfig.repoUrl.trim()) return;
    setBusy(true);
    setSyncStatus({ state: "syncing", message: "" });
    try {
      const res = await syncSetup(syncConfig.repoUrl.trim());
      if (res.ok) {
        setSyncConfig({ enabled: true });
        setSyncStatus({ state: "ok", message: "", lastSyncAt: Date.now() });
      } else {
        setSyncStatus({ state: "error", message: syncErrorText(res) });
      }
    } catch (e) {
      setSyncStatus({ state: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await runManualSync();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="settings-sync">
      <h3
        id="settings-sync"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)] mb-3"
      >
        {t("settings.section.sync")}
      </h3>
      <div className="space-y-3">
        <p className="text-2xs text-[var(--color-fg-muted)] leading-relaxed">{t("sync.intro")}</p>

        <div>
          <label className="text-xs text-[var(--color-fg-muted)] block mb-1">
            {t("sync.repoUrl")}
          </label>
          <input
            type="text"
            value={syncConfig.repoUrl}
            placeholder="git@github.com:you/api-lab-collections.git"
            onChange={(e) => setSyncConfig({ repoUrl: e.target.value })}
            className={inputCls}
            aria-label={t("sync.repoUrl")}
          />
          <p className="text-3xs text-[var(--color-fg-muted)] mt-1">{t("sync.repoUrl.hint")}</p>
        </div>

        <div className="flex items-center gap-2">
          {syncConfig.enabled ? (
            <>
              <Button variant="primary" size="sm" disabled={busy} onClick={syncNow}>
                {t("sync.syncNow")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setSyncConfig({ enabled: false })}
              >
                {t("sync.turnOff")}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={busy || !syncConfig.repoUrl.trim()}
              onClick={setUp}
            >
              {t("sync.setUp")}
            </Button>
          )}
        </div>

        {syncStatus.state !== "idle" && (
          <p
            className={
              "text-2xs " +
              (syncStatus.state === "error" || syncStatus.state === "conflict"
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-fg-muted)]")
            }
          >
            {syncStatus.state === "syncing" && t("sync.status.syncing")}
            {syncStatus.state === "ok" && t("sync.status.ok")}
            {syncStatus.state === "conflict" && t("sync.status.conflict")}
            {syncStatus.state === "error" &&
              t("sync.status.error", { message: syncStatus.message || "?" })}
          </p>
        )}
      </div>
    </section>
  );
}
