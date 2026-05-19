/** Olgun Özoktaş geliştirdi · API Lab */
// Hand-rolled SVG bar / line chart. No charting dependency — matches
// the project posture (markdown, hexdump, JSON highlight, LCS diff are
// all hand-rolled). Pure presenter: data + type in, SVG out.
//
// `forwardRef`s the underlying <svg> so a caller can serialize the
// live node — the Visualize "Export chart" action reaches the element
// through this ref (see lib/vizExport.ts `serializeSvg`).
import { forwardRef, useMemo } from "react";
import { cn } from "../lib/cn";
import type { SeriesPoint } from "../lib/chartable";

export type MiniChartProps = {
  data: SeriesPoint[];
  type: "bar" | "line";
  className?: string;
  "aria-label"?: string;
};

// Fixed SVG coordinate space — scaled to the container via CSS width.
const VW = 640;
const VH = 280;
const PAD = { top: 16, right: 12, bottom: 30, left: 44 };
const CHART_W = VW - PAD.left - PAD.right;
const CHART_H = VH - PAD.top - PAD.bottom;

// Round to a readable axis tick value.
function niceCeil(n: number): number {
  if (n === 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(n))));
  return Math.ceil(n / mag) * mag;
}

export const MiniChart = forwardRef<SVGSVGElement, MiniChartProps>(function MiniChart(
  { data, type, className, "aria-label": ariaLabel },
  ref
) {
  const geom = useMemo(() => {
    const values = data.map((d) => d.value);
    const rawMax = values.length ? Math.max(...values) : 0;
    const rawMin = values.length ? Math.min(...values) : 0;
    const max = niceCeil(Math.max(0, rawMax));
    const min = rawMin < 0 ? -niceCeil(Math.abs(rawMin)) : 0;
    const span = max - min || 1;
    // value → y pixel (top of chart = max, bottom = min)
    const y = (v: number) => PAD.top + ((max - v) / span) * CHART_H;
    const baseY = y(0);
    const slot = data.length ? CHART_W / data.length : CHART_W;
    return { max, min, span, y, baseY, slot };
  }, [data]);

  // Show at most ~12 x-axis labels so dense series stay legible.
  const labelStep = Math.max(1, Math.ceil(data.length / 12));

  if (data.length === 0) return null;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VW} ${VH}`}
      role="img"
      aria-label={ariaLabel}
      className={cn("w-full h-auto select-none", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* y-axis grid lines + tick labels at 0 / mid / max */}
      {[geom.max, (geom.max + geom.min) / 2, geom.min].map((tick, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            y1={geom.y(tick)}
            x2={VW - PAD.right}
            y2={geom.y(tick)}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={geom.y(tick) + 3}
            textAnchor="end"
            className="fill-[var(--color-fg-muted)]"
            style={{ fontSize: "11px" }}
          >
            {Number.isInteger(tick) ? tick : tick.toFixed(1)}
          </text>
        </g>
      ))}

      {/* baseline at zero */}
      <line
        x1={PAD.left}
        y1={geom.baseY}
        x2={VW - PAD.right}
        y2={geom.baseY}
        stroke="var(--color-fg-muted)"
        strokeWidth={1}
      />

      {type === "bar"
        ? data.map((d, i) => {
            const bw = Math.max(1, geom.slot * 0.7);
            const cx = PAD.left + geom.slot * i + geom.slot / 2;
            const vy = geom.y(d.value);
            const top = Math.min(vy, geom.baseY);
            const h = Math.abs(vy - geom.baseY);
            return (
              <rect
                key={i}
                x={cx - bw / 2}
                y={top}
                width={bw}
                height={Math.max(h, 0.5)}
                rx={1.5}
                fill="var(--color-accent)"
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </rect>
            );
          })
        : (() => {
            const pts = data.map((d, i) => {
              const cx = PAD.left + geom.slot * i + geom.slot / 2;
              return `${cx},${geom.y(d.value)}`;
            });
            return (
              <>
                <polyline
                  points={pts.join(" ")}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {data.map((d, i) => {
                  const cx = PAD.left + geom.slot * i + geom.slot / 2;
                  return (
                    <circle key={i} cx={cx} cy={geom.y(d.value)} r={2.5} fill="var(--color-accent)">
                      <title>{`${d.label}: ${d.value}`}</title>
                    </circle>
                  );
                })}
              </>
            );
          })()}

      {/* x-axis labels (thinned) */}
      {data.map((d, i) =>
        i % labelStep === 0 ? (
          <text
            key={i}
            x={PAD.left + geom.slot * i + geom.slot / 2}
            y={VH - PAD.bottom + 16}
            textAnchor="middle"
            className="fill-[var(--color-fg-muted)]"
            style={{ fontSize: "11px" }}
          >
            {d.label.length > 10 ? d.label.slice(0, 9) + "…" : d.label}
          </text>
        ) : null
      )}
    </svg>
  );
});
