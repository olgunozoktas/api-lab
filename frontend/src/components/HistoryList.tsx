/** Olgun Özoktaş geliştirdi · API Lab */
import { useMemo, useState } from "react";
import { useStore } from "../store";
import { methodClass, statusPillClass, statusText, timingBand, timingClass } from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { type TKey } from "../lib/i18n";
import { filterHistory } from "../lib/historyFilter";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Copy, ExternalLink, Play, Trash2 } from "lucide-react";
import type { HistoryItem } from "../lib/types";

type StatusClass = null | 200 | 300 | 400 | 500;

const FILTER_OPTIONS: { value: StatusClass; key: TKey }[] = [
  { value: null, key: "history.filter.all" },
  { value: 200, key: "history.filter.2xx" },
  { value: 300, key: "history.filter.3xx" },
  { value: 400, key: "history.filter.4xx" },
  { value: 500, key: "history.filter.5xx" },
];

function inStatusClass(status: number, cls: StatusClass): boolean {
  if (cls === null) return true;
  return status >= cls && status < cls + 100;
}

export function HistoryList({ query = "" }: { query?: string }) {
  const history = useStore((s) => s.history);
  const loadHistoryItem = useStore((s) => s.loadHistoryItem);
  const openHistoryItemInNewTab = useStore((s) => s.openHistoryItemInNewTab);
  const removeHistoryItem = useStore((s) => s.removeHistoryItem);
  const showToast = useStore((s) => s.showToast);
  const t = useT();
  const [statusFilter, setStatusFilter] = useState<StatusClass>(null);

  const onCopyUrl = (h: HistoryItem) => {
    const url = h.request.url || "";
    navigator.clipboard.writeText(url).then(() => showToast(t("history.context.urlCopied")));
  };

  const trimmedQuery = query.trim();
  const queryFiltering = trimmedQuery.length > 0;
  const filtered = useMemo(() => {
    let out = queryFiltering ? filterHistory(history, trimmedQuery) : history;
    if (statusFilter !== null) {
      out = out.filter((h) => inStatusClass(h.response?.status ?? 0, statusFilter));
    }
    return out;
  }, [history, queryFiltering, trimmedQuery, statusFilter]);

  const filtering = queryFiltering || statusFilter !== null;

  const pills = (
    <div
      className="flex gap-1 px-2 pb-1.5 shrink-0"
      role="group"
      aria-label={t("history.filter.aria")}
    >
      {FILTER_OPTIONS.map((opt) => {
        const active = statusFilter === opt.value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            aria-pressed={active}
            className={
              "px-1.5 py-0.5 rounded-md text-[10px] font-mono cursor-pointer transition-colors " +
              (active
                ? "bg-[var(--color-bg-elev-2)] text-[var(--color-fg)] border border-[var(--color-border)]"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)] border border-transparent")
            }
          >
            {t(opt.key)}
          </button>
        );
      })}
    </div>
  );

  if (history.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-3 py-4 text-[11px] text-[var(--color-fg-muted)] leading-relaxed space-y-3">
        <p className="text-[var(--color-fg)] font-medium text-xs">{t("sidebar.empty.history")}</p>
        <p>{t("sidebar.empty.history.intro")}</p>
        <ul className="space-y-1.5 list-disc pl-4">
          <li>{t("sidebar.empty.history.tip1")}</li>
          <li>{t("sidebar.empty.history.tip2")}</li>
          <li>{t("sidebar.empty.history.tip3")}</li>
        </ul>
      </div>
    );
  }

  if (filtering && filtered.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {pills}
        <div className="flex-1 overflow-y-auto px-1.5 pb-3">
          <div className="text-center text-[11px] text-[var(--color-fg-muted)] py-3">
            {t("collections.search.empty")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {pills}
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        {filtered.slice(0, 100).map((h) => {
          const status = h.response?.status ?? 0;
          const statusLabel = status > 0 ? String(status) : "—";
          const statusFullText = status > 0 ? `${status} ${statusText(status)}`.trim() : "";
          const elapsed = h.response?.elapsedMs;
          const hasTiming = typeof elapsed === "number" && elapsed >= 0;
          const timingTitle = hasTiming
            ? t(`response.timing.band.${timingBand(elapsed)}` as TKey)
            : undefined;
          return (
            <ContextMenu key={h.id}>
              <ContextMenuTrigger asChild>
                <div
                  onClick={() => loadHistoryItem(h)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs hover:bg-[var(--color-bg-elev-2)]"
                >
                  <span
                    className={
                      "font-mono font-bold w-9 flex-shrink-0 text-[10px] " +
                      methodClass(h.request.method)
                    }
                  >
                    {h.request.method}
                  </span>
                  <span className="flex-1 truncate">{h.request.url || "—"}</span>
                  {hasTiming && (
                    <span
                      className={
                        "font-mono text-[10px] flex-shrink-0 cursor-help " + timingClass(elapsed)
                      }
                      title={timingTitle}
                    >
                      {elapsed}ms
                    </span>
                  )}
                  <span
                    className={
                      "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 " +
                      statusPillClass(status)
                    }
                    title={statusFullText || undefined}
                    aria-label={statusFullText || undefined}
                  >
                    {statusLabel}
                  </span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => loadHistoryItem(h)}>
                  <Play className="w-3.5 h-3.5" aria-hidden />
                  {t("history.context.replay")}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => openHistoryItemInNewTab(h)}>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                  {t("history.context.openInNewTab")}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onCopyUrl(h)}>
                  <Copy className="w-3.5 h-3.5" aria-hidden />
                  {t("history.context.copyUrl")}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => removeHistoryItem(h.id)}>
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  {t("history.context.delete")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
}
