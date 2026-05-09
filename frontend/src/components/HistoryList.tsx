import { useStore } from "../store";
import { methodClass } from "../lib/utils";
import { useT } from "../lib/i18n/useT";

export function HistoryList() {
  const history = useStore((s) => s.history);
  const loadHistoryItem = useStore((s) => s.loadHistoryItem);
  const t = useT();

  if (history.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-1.5 pb-3">
        <div className="text-center text-[11px] text-[var(--color-fg-muted)] py-3">
          {t("sidebar.empty.history")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-1.5 pb-3">
      {history.slice(0, 100).map((h) => {
        const status = h.response?.status ?? 0;
        const dot =
          status >= 500 ? "var(--color-danger)" :
          status >= 400 ? "var(--color-warning)" :
          status >= 200 ? "var(--color-success)" :
                          "var(--color-fg-muted)";
        return (
          <div
            key={h.id}
            onClick={() => loadHistoryItem(h)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs hover:bg-[var(--color-bg-elev-2)]"
          >
            <span className={"font-mono font-bold w-9 flex-shrink-0 text-[10px] " + methodClass(h.request.method)}>
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
  );
}
