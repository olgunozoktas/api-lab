/** Olgun Özoktaş geliştirdi · API Lab */
import { useState } from "react";
import { useT } from "../lib/i18n/useT";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { TKey } from "../lib/i18n";
import type { RunRequestStatus, RunResultRow } from "../lib/collectionRunner";

// Pure presenter — the live per-cell status list of a collection run.
// One row per (request × iteration) cell; colour + label track status.
// Rows in `fail` or `error` state are click-to-expand: the panel
// below shows each failing assertion's name + message AND any
// engine-level error (script crash, network error). The detail
// surface is the difference between "it failed" and "here's exactly
// what failed — fix and retry".
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
  // Multiple rows can be expanded at once — easier debugging when
  // two cells fail for the same underlying reason and the user
  // wants to read them side by side.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isExpandable = (r: RunResultRow): boolean => r.status === "fail" || r.status === "error";
  return (
    <div className="flex-1 min-h-0 overflow-auto px-5 py-3">
      <ul className="flex flex-col gap-1">
        {results.map((r) => {
          const failed = r.asserts.filter((a) => !a.passed).length;
          const total = r.asserts.length;
          const open = expanded[r.key] === true;
          const expandable = isExpandable(r);
          return (
            <li key={r.key} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => expandable && setExpanded((m) => ({ ...m, [r.key]: !open }))}
                disabled={!expandable}
                aria-expanded={expandable ? open : undefined}
                className={
                  "w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-[var(--color-bg-elev)] text-left " +
                  (expandable
                    ? "cursor-pointer hover:bg-[var(--color-bg-elev-2)]"
                    : "cursor-default")
                }
              >
                {expandable ? (
                  open ? (
                    <ChevronDown
                      className="w-3 h-3 shrink-0 text-[var(--color-fg-muted)]"
                      aria-hidden
                    />
                  ) : (
                    <ChevronRight
                      className="w-3 h-3 shrink-0 text-[var(--color-fg-muted)]"
                      aria-hidden
                    />
                  )
                ) : (
                  <span className="w-3 h-3 shrink-0" aria-hidden />
                )}
                <span
                  className={
                    "font-mono text-3xs font-semibold px-1.5 py-0.5 rounded shrink-0 w-16 text-center " +
                    pillClass(r.status)
                  }
                >
                  {t(STATUS_KEY[r.status])}
                </span>
                <span className="flex-1 truncate">{r.name}</span>
                {iterationCount > 1 && (
                  <span className="font-mono text-3xs text-[var(--color-fg-muted)] shrink-0">
                    {t("runner.iteration", { n: String(r.iteration + 1) })}
                  </span>
                )}
                {total > 0 && (
                  <span
                    className={
                      "font-mono text-3xs shrink-0 " +
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
                  <span className="font-mono text-3xs text-[var(--color-fg-muted)] shrink-0 tabular-nums">
                    {r.durationMs}ms
                  </span>
                )}
              </button>
              {expandable && open && (
                <FailureDetail
                  asserts={r.asserts}
                  error={r.error}
                  responseStatus={r.responseStatus}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Expanded panel for a failed/errored cell. Lists each failing
// assertion with its name + message, and the engine-level error
// (script crash, network) when present. Passed asserts collapse to
// a one-line tally so the surface stays focused on the failures.
function FailureDetail({
  asserts,
  error,
  responseStatus,
}: {
  asserts: { name: string; passed: boolean; message?: string }[];
  error?: string;
  responseStatus?: number;
}) {
  const t = useT();
  const failed = asserts.filter((a) => !a.passed);
  const passedCount = asserts.length - failed.length;
  return (
    <div className="ml-6 px-3 py-2 text-2xs bg-[var(--color-bg)] border-l-2 border-[var(--color-danger)]/40 rounded-r">
      {error && (
        <p className="text-[var(--color-warning)] font-mono mb-1 whitespace-pre-wrap break-words">
          {error}
        </p>
      )}
      {responseStatus !== undefined && responseStatus > 0 && (
        <p className="text-[var(--color-fg-muted)] mb-1">
          {t("runner.responseStatus", { status: String(responseStatus) })}
        </p>
      )}
      {failed.length === 0 && !error ? (
        <p className="text-[var(--color-fg-muted)]">{t("runner.detail.noAssertMessages")}</p>
      ) : (
        <ul className="space-y-0.5">
          {failed.map((a, i) => (
            <li key={i} className="text-[var(--color-fg)]">
              <span className="font-mono text-[var(--color-danger)] mr-1.5">✗</span>
              <span className="font-medium">{a.name}</span>
              {a.message && (
                <span className="ml-2 text-[var(--color-fg-muted)] font-mono">{a.message}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {passedCount > 0 && failed.length > 0 && (
        <p className="text-[var(--color-fg-muted)] mt-1">
          {t("runner.detail.passedTally", { count: String(passedCount) })}
        </p>
      )}
    </div>
  );
}
