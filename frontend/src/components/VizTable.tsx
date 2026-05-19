/** Olgun Özoktaş geliştirdi · API Lab */
// Sortable table for the response Visualize view. Click a column
// header to sort by it; click again to flip direction. Pure presenter
// — no store access.
//
// Controlled, not self-stateful: the parent owns `sort` and hands in
// the already-sorted `rows`. That keeps one sort site for both the
// table render and the "Export CSV" action, so a CSV download always
// matches exactly what the user sees.
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../lib/cn";
import { formatCell, type SortDir, type VizColumn, type VizRow } from "../lib/chartable";
import { useT } from "../lib/i18n/useT";

export type VizSort = { column: string; dir: SortDir };

export type VizTableProps = {
  columns: VizColumn[];
  // Rows in display order — the caller sorts before passing them in.
  rows: VizRow[];
  // Active sort, or null when the response's natural order is shown.
  sort: VizSort | null;
  // Header click — toggles direction or switches column.
  onSortChange: (key: string) => void;
  className?: string;
};

export function VizTable({ columns, rows, sort, onSortChange, className }: VizTableProps) {
  const t = useT();

  return (
    <div className={cn("overflow-auto", className)}>
      <table className="w-full border-collapse font-mono text-2xs select-text">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {columns.map((c) => {
              const active = sort?.column === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={cn(
                    "px-2.5 py-1.5 font-semibold text-[var(--color-fg-muted)]",
                    c.numeric ? "text-right" : "text-left"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSortChange(c.key)}
                    aria-label={t("response.viz.sortBy", { name: c.key })}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-[var(--color-fg)] transition-colors",
                      c.numeric && "flex-row-reverse",
                      active && "text-[var(--color-fg)]"
                    )}
                  >
                    <span className="break-all">{c.key}</span>
                    {active &&
                      (sort!.dir === "asc" ? (
                        <ChevronUp className="w-3 h-3 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDown className="w-3 h-3 shrink-0" aria-hidden />
                      ))}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--color-border)]">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-2.5 py-1.5 align-top break-all",
                    c.numeric && "text-right tabular-nums"
                  )}
                >
                  {formatCell(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
