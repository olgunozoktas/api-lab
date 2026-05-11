import { useMemo, useState } from "react";
import { useStore } from "../store";
import { methodClass } from "../lib/utils";
import { useT } from "../lib/i18n/useT";
import { type TKey } from "../lib/i18n";
import { filterHistory } from "../lib/historyFilter";

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
  const t = useT();
  const [statusFilter, setStatusFilter] = useState<StatusClass>(null);

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
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        <div className="text-center text-[11px] text-[var(--color-fg-muted)] py-3">
          {t("sidebar.empty.history")}
        </div>
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
          const dot =
            status >= 500
              ? "var(--color-danger)"
              : status >= 400
                ? "var(--color-warning)"
                : status >= 200
                  ? "var(--color-success)"
                  : "var(--color-fg-muted)";
          return (
            <div
              key={h.id}
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
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: dot }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
