/** Olgun Özoktaş geliştirdi · API Lab */
import { useT } from "../lib/i18n/useT";
import type { TKey } from "../lib/i18n";
import type { RunRequestStatus, RunResultRow } from "../lib/collectionRunner";

// Pure presenter — the live per-cell status list of a collection run.
// One row per (request × iteration) cell; colour + label track status.
export type CollectionRunProgressProps = {
  results: RunResultRow[];
  iterationCount: number;
};

const STATUS_KEY: Record<RunRequestStatus, TKey> = {
  pending: "runner.status.pending",
  firing: "runner.status.firing",
  pass: "runner.status.pass",
  fail: "runner.status.fail",
  error: "runner.status.error",
};

function pillClass(status: RunRequestStatus): string {
  switch (status) {
    case "pass":
      return "bg-[var(--color-success)]/15 text-[var(--color-success)]";
    case "fail":
      return "bg-[var(--color-danger)]/15 text-[var(--color-danger)]";
    case "error":
      return "bg-[var(--color-warning)]/15 text-[var(--color-warning)]";
    case "firing":
      return "bg-[var(--color-accent)]/15 text-[var(--color-accent)]";
    default:
      return "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]";
  }
}

export function CollectionRunProgress({ results, iterationCount }: CollectionRunProgressProps) {
  const t = useT();
  return (
    <div className="flex-1 min-h-0 overflow-auto px-5 py-3">
      <ul className="flex flex-col gap-1">
        {results.map((r) => {
          const failed = r.asserts.filter((a) => !a.passed).length;
          const total = r.asserts.length;
          return (
            <li
              key={r.key}
              className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-[var(--color-bg-elev)]"
            >
              <span
                className={
                  "font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 w-16 text-center " +
                  pillClass(r.status)
                }
              >
                {t(STATUS_KEY[r.status])}
              </span>
              <span className="flex-1 truncate">{r.name}</span>
              {iterationCount > 1 && (
                <span className="font-mono text-[10px] text-[var(--color-fg-muted)] shrink-0">
                  {t("runner.iteration", { n: String(r.iteration + 1) })}
                </span>
              )}
              {total > 0 && (
                <span
                  className={
                    "font-mono text-[10px] shrink-0 " +
                    (failed > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-fg-muted)]")
                  }
                >
                  {t("runner.assertShort", {
                    passed: String(total - failed),
                    total: String(total),
                  })}
                </span>
              )}
              {(r.status === "pass" || r.status === "fail" || r.status === "error") && (
                <span className="font-mono text-[10px] text-[var(--color-fg-muted)] shrink-0 tabular-nums">
                  {r.durationMs}ms
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
