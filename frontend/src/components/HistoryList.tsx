/** Olgun Özoktaş geliştirdi · API Lab */
// History sidebar list — past sends, newest first, with status-class
// filter pills and a search box. Click an entry to load it into the
// active tab; right-click for replay / open-in-new-tab / delete.
import { useMemo, useState } from "react";
import { useActiveVars, useStore } from "../store";
import {
  methodClass,
  statusPillClass,
  statusText,
  timeAgo,
  timingBand,
  timingClass,
} from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { type TKey } from "../lib/i18n";
import { filterHistory } from "../lib/historyFilter";
import { EmptyState } from "./ui/empty-state";
import { History } from "lucide-react";
import { buildBody, buildHeadersList, buildUrl, effectiveContentType } from "../lib/sendRequest";
import { toCurl } from "../lib/codegen/curl";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Copy, ExternalLink, Play, Terminal, Trash2 } from "lucide-react";
import type { CurrentRequest, HistoryItem } from "../lib/types";

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

  const vars = useActiveVars();

  const onCopyUrl = (h: HistoryItem) => {
    const url = h.request.url || "";
    navigator.clipboard
      .writeText(url)
      .then(() => showToast(t("history.context.urlCopied"), { severity: "success" }));
  };

  // Re-build the wire-level cURL command for a historical request the
  // same way CopyAsMenu does for the live composer: substitute env
  // vars, fold auth into headers, attach the body (skipped for
  // GET/HEAD), and set content-type. RequestSnapshot is widened to
  // CurrentRequest by stubbing the two extra fields buildUrl never
  // reads.
  const onCopyCurl = (h: HistoryItem) => {
    const req = { ...h.request, id: null, name: "" } as CurrentRequest;
    const isGraphql = !!h.request.isGraphql;
    const url = buildUrl(req, vars);
    const method = isGraphql ? "POST" : h.request.method;
    const headers = buildHeadersList(req, vars);
    effectiveContentType(req, isGraphql, headers);
    const body =
      method === "GET" || method === "HEAD" ? null : (buildBody(req, isGraphql, vars) ?? null);
    const headersArr: { name: string; value: string }[] = [];
    headers.forEach((v, k) => headersArr.push({ name: k, value: v }));
    const code = toCurl({ method, url, headers: headersArr, body });
    navigator.clipboard
      .writeText(code)
      .then(() => showToast(t("history.context.curlCopied"), { severity: "success" }));
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
              "px-1.5 py-0.5 rounded-md text-3xs font-mono cursor-pointer transition-colors " +
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
      <div className="flex-1 overflow-y-auto">
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title={t("sidebar.empty.history")}
          description={t("sidebar.empty.history.intro")}
        >
          <ul className="space-y-1.5 list-disc pl-4 text-left text-2xs text-[var(--color-fg-muted)] leading-relaxed mx-auto max-w-xs">
            <li>{t("sidebar.empty.history.tip1")}</li>
            <li>{t("sidebar.empty.history.tip2")}</li>
            <li>{t("sidebar.empty.history.tip3")}</li>
          </ul>
        </EmptyState>
      </div>
    );
  }

  if (filtering && filtered.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {pills}
        <div className="flex-1 overflow-y-auto px-1.5 pb-3">
          <div className="text-center text-2xs text-[var(--color-fg-muted)] py-3">
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
        {/* Render at most 100 rows — bounds the DOM on a long history;
            the full list stays reachable through the filter/search. */}
        {filtered.slice(0, 100).map((h) => {
          const status = h.response?.status ?? 0;
          const statusLabel = status > 0 ? String(status) : "—";
          const statusFullText = status > 0 ? `${status} ${statusText(status)}`.trim() : "";
          const elapsed = h.response?.elapsedMs;
          const hasTiming = typeof elapsed === "number" && elapsed >= 0;
          const timingTitle = hasTiming
            ? t(`response.timing.band.${timingBand(elapsed)}` as TKey)
            : undefined;
          const hasTs = typeof h.ts === "number" && h.ts > 0;
          const tsTitle = hasTs ? new Date(h.ts).toLocaleString() : undefined;
          return (
            <ContextMenu key={h.id}>
              <ContextMenuTrigger asChild>
                <div
                  onClick={() => loadHistoryItem(h)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs hover:bg-[var(--color-bg-elev-2)]"
                >
                  <span
                    className={
                      "font-mono font-bold w-12 flex-shrink-0 text-3xs " +
                      methodClass(h.request.method)
                    }
                  >
                    {h.request.method}
                  </span>
                  <span className="flex-1 truncate">{h.request.url || "—"}</span>
                  {hasTs && (
                    <span
                      className="font-mono text-3xs text-[var(--color-fg-muted)] flex-shrink-0 cursor-help"
                      title={tsTitle}
                    >
                      {timeAgo(h.ts)}
                    </span>
                  )}
                  {hasTiming && (
                    <span
                      className={
                        "font-mono text-3xs flex-shrink-0 cursor-help " + timingClass(elapsed)
                      }
                      title={timingTitle}
                    >
                      {elapsed}ms
                    </span>
                  )}
                  <span
                    className={
                      "font-mono text-3xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 " +
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
                <ContextMenuItem onSelect={() => onCopyCurl(h)}>
                  <Terminal className="w-3.5 h-3.5" aria-hidden />
                  {t("history.context.copyCurl")}
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
