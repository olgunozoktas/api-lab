/** Olgun Özoktaş geliştirdi · API Lab */
// The response "Visualize" view — turns a JSON array response into a
// sortable table plus a bar / line chart. Lazy-loaded from
// ResponseViewer so neither this component nor its SVG chart enters
// the first-paint bundle.
import { useMemo, useState } from "react";
import { BarChart3, LineChart, Table2 } from "lucide-react";
import { useStore } from "../store";
import { useT } from "../lib/i18n/useT";
import { analyzeResponse, buildSeries, type VizReason } from "../lib/chartable";
import { VizTable } from "./VizTable";
import { MiniChart } from "./MiniChart";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

// Cap the points fed to the SVG chart — a series of thousands of bars
// is unreadable and slow. The table still shows every row.
const CHART_POINT_CAP = 150;

type ViewMode = "table" | "chart";
type ChartType = "bar" | "line";

// Presenter — pure: takes the raw response body, owns view-local UI state.
export type ResponseVisualizeProps = {
  body: string | null;
};

export function ResponseVisualize({ body }: ResponseVisualizeProps) {
  const analysis = useMemo(() => analyzeResponse(body ?? ""), [body]);

  if (analysis.kind === "not-chartable") {
    return <NotVisualizable reason={analysis.reason} />;
  }
  return <VisualizeView analysis={analysis} />;
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
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-6">
      <BarChart3 className="w-8 h-8 text-[var(--color-fg-muted)]" aria-hidden />
      <div className="text-sm text-[var(--color-fg)]">{t("response.viz.notVisualizable")}</div>
      <div className="text-2xs text-[var(--color-fg-muted)] max-w-sm">{t(hintKey)}</div>
    </div>
  );
}

function VisualizeView({
  analysis,
}: {
  analysis: Extract<ReturnType<typeof analyzeResponse>, { kind: "chartable" }>;
}) {
  const t = useT();
  const { columns, rows, numericColumns, labelColumn } = analysis;
  const hasChart = numericColumns.length > 0;

  const [view, setView] = useState<ViewMode>("table");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [valueColumn, setValueColumn] = useState(numericColumns[0] ?? "");

  // Guard against a stale column selection if the response changed.
  const activeColumn = numericColumns.includes(valueColumn)
    ? valueColumn
    : (numericColumns[0] ?? "");

  const chartRows = rows.length > CHART_POINT_CAP ? rows.slice(0, CHART_POINT_CAP) : rows;
  const series = useMemo(
    () => (activeColumn ? buildSeries(chartRows, activeColumn, labelColumn) : []),
    [chartRows, activeColumn, labelColumn]
  );

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

        {/* Envelope hint — the response was an object; this is the
            array property that got unwrapped (e.g. `data[]`). */}
        {analysis.unwrappedFrom && (
          <Badge tone="accent" size="sm" className="ml-auto">
            {t("response.viz.unwrapped", { key: analysis.unwrappedFrom })}
          </Badge>
        )}
        <Badge tone="neutral" size="sm" className={analysis.unwrappedFrom ? "" : "ml-auto"}>
          {t("response.viz.rowCount", { n: String(rows.length) })}
        </Badge>
      </div>

      {/* content */}
      {view === "table" ? (
        <VizTable columns={columns} rows={rows} className="flex-1 p-3" />
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <MiniChart
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

// Container — wires the store. Reads the last response body only;
// all view state is local.
export function ResponseVisualizeContainer() {
  const body = useStore((s) => s.lastResponse?.body ?? null);
  return <ResponseVisualize body={body} />;
}
