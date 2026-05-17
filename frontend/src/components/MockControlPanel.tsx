/** Olgun Özoktaş geliştirdi · API Lab */
// MockControlPanel — modal surface for the local mock-server feature.
// Lists every active loopback mock and lets the user start one for the
// current request's saved examples, stop one, or stop all.
//
// This is a modal host (top-level surface), so per the project's
// component rules it may read the store directly. The active-mock
// rows are a pure inline map — no per-row store access.
import { useCallback, useEffect, useState } from "react";
import { Server, Square, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useT } from "../lib/i18n/useT";
import { useStore } from "../store";
import { bridge } from "../lib/bridge";
import {
  buildMockStartPayload,
  listMocks,
  mockBaseUrl,
  startMock,
  stopMock,
  type MockServerInfo,
} from "../lib/mock";

export type MockControlPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MockControlPanel({ open, onOpenChange }: MockControlPanelProps) {
  const t = useT();
  const current = useStore((s) => s.current);
  const showToast = useStore((s) => s.showToast);
  const [mocks, setMocks] = useState<MockServerInfo[]>([]);
  const [busy, setBusy] = useState(false);

  const examples = current.examples ?? [];
  const available = bridge.available;

  const refresh = useCallback(async () => {
    if (!bridge.available) return;
    try {
      setMocks(await listMocks());
    } catch {
      /* a failed list is non-fatal — keep the last known rows */
    }
  }, []);

  // Re-list whenever the modal opens so the rows reflect reality even
  // if a mock was started/stopped in a previous session of the modal.
  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const onStart = useCallback(async () => {
    if (examples.length === 0 || busy) return;
    setBusy(true);
    try {
      const res = await startMock(buildMockStartPayload(current.id, examples));
      if (res.error || res.port === undefined) {
        showToast(t("mock.toast.startFailed", { error: res.error ?? "?" }));
      } else {
        showToast(t("mock.toast.started", { port: String(res.port) }));
      }
      await refresh();
    } catch (e) {
      showToast(t("mock.toast.startFailed", { error: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  }, [busy, current.id, examples, refresh, showToast, t]);

  const onStop = useCallback(
    async (id: number) => {
      if (busy) return;
      setBusy(true);
      try {
        await stopMock(id);
        showToast(t("mock.toast.stopped"));
        await refresh();
      } catch (e) {
        showToast(t("mock.toast.stopFailed", { error: (e as Error).message }));
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh, showToast, t]
  );

  const onStopAll = useCallback(async () => {
    if (busy || mocks.length === 0) return;
    setBusy(true);
    try {
      for (const m of mocks) await stopMock(m.id);
      showToast(t("mock.toast.stoppedAll", { n: String(mocks.length) }));
      await refresh();
    } catch (e) {
      showToast(t("mock.toast.stopFailed", { error: (e as Error).message }));
    } finally {
      setBusy(false);
    }
  }, [busy, mocks, refresh, showToast, t]);

  const onCopy = useCallback(
    async (port: number) => {
      try {
        await navigator.clipboard.writeText(mockBaseUrl(port));
        showToast(t("mock.urlCopied"));
      } catch {
        /* clipboard denial is silent — the URL is visible in the row */
      }
    },
    [showToast, t]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[92vw] max-h-[88vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-[var(--color-border)]">
          <DialogTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4" />
            {t("mock.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5 min-h-0">
          <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">{t("mock.desc")}</p>

          {!available && (
            <p className="text-xs text-[var(--color-fg-muted)] border border-[var(--color-border)] rounded px-3 py-2">
              {t("mock.unavailable")}
            </p>
          )}

          {/* Current request → start a mock from its saved examples. */}
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-fg-muted)]">
              {t("mock.current.title")}
            </h3>
            <div className="flex items-center justify-between gap-3 border border-[var(--color-border)] rounded px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm truncate">{current.name}</p>
                <p className="text-[11px] text-[var(--color-fg-muted)]">
                  {examples.length === 0
                    ? t("mock.current.noExamples")
                    : t("mock.exampleCount", { n: String(examples.length) })}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={!available || busy || examples.length === 0}
                onClick={onStart}
              >
                <Server className="w-3.5 h-3.5" />
                {t("mock.start")}
              </Button>
            </div>
          </section>

          {/* Active mocks. */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-fg-muted)]">
                {t("mock.active.title")}
              </h3>
              {mocks.length > 0 && (
                <Button variant="danger" size="sm" disabled={busy} onClick={onStopAll}>
                  {t("mock.stopAll")}
                </Button>
              )}
            </div>
            {mocks.length === 0 ? (
              <p className="text-xs text-[var(--color-fg-muted)] px-1 py-2">
                {t("mock.active.empty")}
              </p>
            ) : (
              <ul role="list" className="flex flex-col gap-1.5">
                {mocks.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 border border-[var(--color-border)] rounded px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono truncate">{mockBaseUrl(m.port)}</p>
                      <p className="text-[11px] text-[var(--color-fg-muted)]">
                        {t("mock.exampleCount", { n: String(m.exampleCount) })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("mock.copyUrl")}
                        title={t("mock.copyUrl")}
                        onClick={() => onCopy(m.port)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => onStop(m.id)}
                      >
                        <Square className="w-3 h-3" />
                        {t("mock.stop")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
