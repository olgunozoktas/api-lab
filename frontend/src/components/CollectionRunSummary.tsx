/** Olgun Özoktaş geliştirdi · API Lab */
import { useT } from "../lib/i18n/useT";
import type { RunSummary } from "../lib/collectionRunner";

// Pure presenter — end-of-run summary: request + assertion tallies,
// total elapsed wall time, and a per-request average-duration
// histogram (bars scaled to the slowest request).
export type CollectionRunSummaryProps = {
  summary: RunSummary;
  wallMs: number;
};

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-[var(--color-bg-elev)]">
      <span className={"text-lg font-semibold tabular-nums " + tone}>{value}</span>
      <span className="text-3xs text-[var(--color-fg-muted)]">{label}</span>
    </div>
  );
}

export function CollectionRunSummary({ summary, wallMs }: CollectionRunSummaryProps) {
  const t = useT();
  const maxAvg = Math.max(1, ...summary.perRequest.map((p) => p.avgMs));
  const seconds = (wallMs / 1000).toFixed(1);

  return (
    <div className="flex-1 min-h-0 overflow-auto px-5 py-4 flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat
          label={t("runner.summary.passed")}
          value={String(summary.passed)}
          tone="text-[var(--color-success)]"
        />
        <Stat
          label={t("runner.summary.failed")}
          value={String(summary.failed)}
          tone="text-[var(--color-danger)]"
        />
        <Stat
          label={t("runner.summary.errored")}
          value={String(summary.errored)}
          tone="text-[var(--color-warning)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label={t("runner.summary.assertions")}
          value={t("runner.assertShort", {
            passed: String(summary.assertsPassed),
            total: String(summary.assertsPassed + summary.assertsFailed),
          })}
          tone={summary.assertsFailed > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-fg)]"}
        />
        <Stat
          label={t("runner.summary.elapsed")}
          value={t("runner.summary.seconds", { s: seconds })}
          tone="text-[var(--color-fg)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-2xs font-medium text-[var(--color-fg-muted)]">
          {t("runner.summary.histogram")}
        </span>
        {summary.perRequest.map((p) => (
          <div key={p.requestId} className="flex items-center gap-2 text-xs">
            <span className="w-40 truncate shrink-0">{p.name}</span>
            <div className="flex-1 h-3 bg-[var(--color-bg-elev-2)] rounded overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)]"
                style={{ width: `${Math.max(2, (p.avgMs / maxAvg) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-3xs text-[var(--color-fg-muted)] w-14 text-right tabular-nums shrink-0">
              {p.avgMs}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
