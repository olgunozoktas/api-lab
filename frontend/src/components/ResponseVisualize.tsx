/** Olgun Özoktaş geliştirdi · API Lab */
// The response "Visualize" view — turns a JSON array response into a
// sortable table plus a bar / line chart. Lazy-loaded from
// ResponseViewer so neither this component nor its SVG chart enters
// the first-paint bundle.
import { useMemo, useRef, useState } from "react";
import { BarChart3, Download, LineChart, Table2 } from "lucide-react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import {
  analyzeResponse,
  buildSeries,
  sortRows,
  type VizReason,
  type VizRow,
} from "../lib/chartable";
import { downloadTextFile } from "../lib/responseDownload";
import { rowsToCsv, serializeSvg } from "../lib/vizExport";
import type { ToastOptions } from "../lib/toast";
import { VizTable, type VizSort } from "./VizTable";
import { MiniChart } from "./MiniChart";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

// Cap the points fed to the SVG chart — a series of thousands of bars
// is unreadable and slow. The table still shows every row.
const CHART_POINT_CAP = 150;

type ViewMode = "table" | "chart";
type ChartType = "bar" | "line";

// Presenter — pure: takes the raw response body + a toast callback,
// owns view-local UI state. The toast callback is threaded as a prop
// (rather than read from the store here) so this stays store-agnostic
// and mountable in isolation.
export type ResponseVisualizeProps = {
  body: string | null;
  onToast: (msg: string, opts?: ToastOptions) => void;
};

export function ResponseVisualize({ body, onToast }: ResponseVisualizeProps) {
  const analysis = useMemo(() => analyzeResponse(body ?? ""), [body]);

  if (analysis.kind === "not-chartable") {
    return <NotVisualizable reason={analysis.reason} />;
  }
  return <VisualizeView analysis={analysis} onToast={onToast} />;
}

// Reason-specific empty state when the response can't be visualized.
function NotVisualizable({ reason }: { reason: VizReason }) {
  const t = useT();
  const hintKey = (
    {
      "invalid-json": "response.viz.reason.invalidJson",
      "not-array": "response.viz.reason.notArray",
      empty: "response.viz.reason.empty",
      "no-objects": "response.viz.reason.noObjects",
    } as const
  )[reason];
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <EmptyState
        icon={<BarChart3 className="w-5 h-5" />}
        title={t("response.viz.notVisualizable")}
        description={t(hintKey)}
      />
    </div>
  );
}

function VisualizeView({
  analysis,
  onToast,
}: {
  analysis: Extract<ReturnType<typeof analyzeResponse>, { kind: "chartable" }>;
  onToast: (msg: string, opts?: ToastOptions) => void;
}) {
  const t = useT();
  const { columns, rows, numericColumns, labelColumn } = analysis;
  const hasChart = numericColumns.length > 0;

  const [view, setView] = useState<ViewMode>("table");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [valueColumn, setValueColumn] = useState(numericColumns[0] ?? "");
  // Sort lives here, not in VizTable: one sort site feeds both the
  // table render and the CSV export so a download matches the view.
  const [sort, setSort] = useState<VizSort | null>(null);
  // Live <svg> node for the "Export chart" action (forwarded by MiniChart).
  const chartRef = useRef<SVGSVGElement>(null);

  // Guard against a stale column selection if the response changed.
  const activeColumn = numericColumns.includes(valueColumn)
    ? valueColumn
    : (numericColumns[0] ?? "");

  const sortedRows = useMemo<VizRow[]>(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.column);
    return sortRows(rows, sort.column, sort.dir, col?.numeric ?? false);
  }, [rows, columns, sort]);

  const onSortChange = (key: string) => {
    setSort((prev) => {
      if (prev?.column !== key) return { column: key, dir: "asc" };
      return { column: key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  };

  const chartRows =
    sortedRows.length > CHART_POINT_CAP ? sortedRows.slice(0, CHART_POINT_CAP) : sortedRows;
  const series = useMemo(
    () => (activeColumn ? buildSeries(chartRows, activeColumn, labelColumn) : []),
    [chartRows, activeColumn, labelColumn]
  );

  const onExportCsv = () => {
    downloadTextFile(rowsToCsv(columns, sortedRows), "visualize.csv", "text/csv");
    onToast(t("response.viz.csvExported"), { severity: "success" });
  };

  const onExportChart = () => {
    // The button only renders in chart view, where MiniChart is
    // mounted — so the ref is populated. Guard anyway.
    const svg = chartRef.current;
    if (!svg) return;
    downloadTextFile(serializeSvg(svg), "visualize-chart.svg", "image/svg+xml");
    onToast(t("response.viz.chartExported"), { severity: "success" });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* control bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] shrink-0 flex-wrap">
        <div className="flex items-center gap-0.5">
          <Button
            variant={view === "table" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
          >
            <Table2 className="w-3.5 h-3.5" aria-hidden />
            {t("response.viz.table")}
          </Button>
          <Button
            variant={view === "chart" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setView("chart")}
            disabled={!hasChart}
            aria-pressed={view === "chart"}
            title={hasChart ? undefined : t("response.viz.noNumeric")}
          >
            <BarChart3 className="w-3.5 h-3.5" aria-hidden />
            {t("response.viz.chart")}
          </Button>
        </div>

        {view === "chart" && hasChart && (
          <>
            <Select value={activeColumn} onValueChange={setValueColumn}>
              <SelectTrigger aria-label={t("response.viz.columnAria")} className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-0.5">
              <Button
                variant={chartType === "bar" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setChartType("bar")}
                aria-pressed={chartType === "bar"}
                aria-label={t("response.viz.bar")}
                title={t("response.viz.bar")}
              >
                <BarChart3 className="w-3.5 h-3.5" aria-hidden />
              </Button>
              <Button
                variant={chartType === "line" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setChartType("line")}
                aria-pressed={chartType === "line"}
                aria-label={t("response.viz.line")}
                title={t("response.viz.line")}
              >
                <LineChart className="w-3.5 h-3.5" aria-hidden />
              </Button>
            </div>
          </>
        )}

        {/* Export — CSV in table view, standalone SVG in chart view.
            `ml-auto` floats this + the badges to the right edge. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={view === "table" ? onExportCsv : onExportChart}
          className="ml-auto"
        >
          <Download className="w-3.5 h-3.5" aria-hidden />
          {view === "table" ? t("response.viz.exportCsv") : t("response.viz.exportChart")}
        </Button>

        {/* Envelope hint — the response was an object; this is the
            array property that got unwrapped (e.g. `data[]`). */}
        {analysis.unwrappedFrom && (
          <Badge tone="accent" size="sm">
            {t("response.viz.unwrapped", { key: analysis.unwrappedFrom })}
          </Badge>
        )}
        <Badge tone="neutral" size="sm">
          {t("response.viz.rowCount", { n: String(rows.length) })}
        </Badge>
      </div>

      {/* content */}
      {view === "table" ? (
        <VizTable
          columns={columns}
          rows={sortedRows}
          sort={sort}
          onSortChange={onSortChange}
          className="flex-1 p-3"
        />
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <MiniChart
            ref={chartRef}
            data={series}
            type={chartType}
            aria-label={t("response.viz.chartAria", { column: activeColumn })}
          />
          {rows.length > CHART_POINT_CAP && (
            <div className="text-3xs text-[var(--color-fg-muted)] text-center mt-2">
              {t("response.viz.chartCapped", {
                shown: String(CHART_POINT_CAP),
                total: String(rows.length),
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Container — wires the store. Reads the last response body and the
// toast action; all view state stays local to the presenter.
export function ResponseVisualizeContainer() {
  const body = useStore((s) => s.lastResponse?.body ?? null);
  const showToast = useStore((s) => s.showToast);
  return <ResponseVisualize body={body} onToast={showToast} />;
}
