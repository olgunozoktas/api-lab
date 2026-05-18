/** Olgun Özoktaş geliştirdi · API Lab */
// Sortable table for the response Visualize view. Click a column
// header to sort by it; click again to flip direction. Pure presenter
// — columns + rows in, no store access.
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../lib/cn";
import { formatCell, sortRows, type SortDir, type VizColumn, type VizRow } from "../lib/chartable";
import { useT } from "../lib/i18n/useT";

export type VizTableProps = {
  columns: VizColumn[];
  rows: VizRow[];
  className?: string;
};

export function VizTable({ columns, rows, className }: VizTableProps) {
  const t = useT();
  const [sort, setSort] = useState<{ column: string; dir: SortDir } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.column);
    return sortRows(rows, sort.column, sort.dir, col?.numeric ?? false);
  }, [rows, columns, sort]);

  const onSort = (key: string) => {
    setSort((prev) => {
      if (prev?.column !== key) return { column: key, dir: "asc" };
      return { column: key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  };

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
                    onClick={() => onSort(c.key)}
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
          {sorted.map((row, i) => (
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
