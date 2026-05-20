/** Olgun Özoktaş geliştirdi · API Lab */
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { CollectionRunProgress } from "./CollectionRunProgress";
import { CollectionRunSummary } from "./CollectionRunSummary";
import { useStore, useActiveVars } from "../store";
import { useT } from "../lib/i18n/useT";
import { parseIterationData } from "../lib/iterationData";
import {
  runCollection,
  resolveFolderRequests,
  summarize,
  toNewmanJson,
  type RunMode,
  type RunPlan,
  type RunResultRow,
} from "../lib/collectionRunner";

export type CollectionRunnerModalProps = {
  open: boolean;
  folderId: string | null;
  onOpenChange: (open: boolean) => void;
};

type Phase = "config" | "running" | "done";

// Container — resolves the folder's requests, owns the iteration-data
// + run state, drives the engine, and hosts the progress / summary
// presenters.
export function CollectionRunnerModal({
  open,
  folderId,
  onOpenChange,
}: CollectionRunnerModalProps) {
  const t = useT();
  const collectionItems = useStore((s) => s.collectionItems);
  const defaults = useStore((s) => s.defaults);
  const baseVars = useActiveVars();

  const folder = folderId
    ? collectionItems.find((i) => i.id === folderId && i.kind === "folder")
    : undefined;
  const requests = useMemo(
    () => (folderId ? resolveFolderRequests(collectionItems, folderId) : []),
    [collectionItems, folderId]
  );

  const [mode, setMode] = useState<RunMode>("sequential");
  const [dataText, setDataText] = useState("");
  const [parsed, setParsed] = useState<Record<string, string>[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("config");
  const [results, setResults] = useState<RunResultRow[]>([]);
  const [wallMs, setWallMs] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Reset every field when the modal (re)opens for a folder.
  useEffect(() => {
    if (!open) return;
    setMode("sequential");
    setDataText("");
    setParsed([]);
    setDataError(null);
    setPhase("config");
    setResults([]);
    setWallMs(0);
  }, [open, folderId]);

  const onDataChange = (text: string) => {
    setDataText(text);
    if (!text.trim()) {
      setParsed([]);
      setDataError(null);
      return;
    }
    try {
      setParsed(parseIterationData(text));
      setDataError(null);
    } catch (e) {
      setParsed([]);
      setDataError((e as Error).message);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onDataChange(await file.text());
  };

  const run = async () => {
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase("running");
    setResults([]);
    const plan: RunPlan = { requests, rows: parsed, mode, baseVars, defaults };
    const t0 = performance.now();
    const final = await runCollection(plan, { onProgress: setResults, signal: ac.signal });
    setWallMs(performance.now() - t0);
    setResults(final);
    setPhase("done");
    abortRef.current = null;
  };

  // Re-run only the failed / errored cells from the previous run. The
  // engine fires those specific (request, iteration) pairs via the
  // optional `workList` arg — keys stay stable across runs (same
  // shape `${iteration}::${id}`), so we merge each new result back
  // into the prior list rather than replacing it. Previously-passed
  // cells stay visible + green; the user sees the re-run as a
  // continuation, not a fresh start.
  const rerunFailed = async () => {
    const failedRows = results.filter((r) => r.status === "fail" || r.status === "error");
    if (failedRows.length === 0) return;
    const workList = failedRows.map((r) => ({ requestId: r.requestId, iteration: r.iteration }));
    // Reset the targeted cells to pending so the progress UI shows
    // them firing again; passed cells stay untouched.
    const targeted = new Set(failedRows.map((r) => r.key));
    setResults((prev) =>
      prev.map((r) =>
        targeted.has(r.key)
          ? { ...r, status: "pending", durationMs: 0, asserts: [], error: undefined }
          : r
      )
    );
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase("running");
    const plan: RunPlan = { requests, rows: parsed, mode, baseVars, defaults, workList };
    const t0 = performance.now();
    const partial = await runCollection(plan, {
      // Merge each progress update back into the previous results so
      // unaffected cells keep their state. Without the merge the
      // partial result list (just the failed cells) would temporarily
      // replace the full list.
      onProgress: (rows) =>
        setResults((prev) => {
          const byKey = new Map(rows.map((r) => [r.key, r]));
          return prev.map((r) => byKey.get(r.key) ?? r);
        }),
      signal: ac.signal,
    });
    const byKey = new Map(partial.map((r) => [r.key, r]));
    setResults((prev) => prev.map((r) => byKey.get(r.key) ?? r));
    setWallMs((prev) => prev + (performance.now() - t0));
    setPhase("done");
    abortRef.current = null;
  };

  const failedCount = useMemo(
    () => results.filter((r) => r.status === "fail" || r.status === "error").length,
    [results]
  );

  const summary = useMemo(() => summarize(results), [results]);
  const iterationCount = parsed.length || 1;

  const exportJson = () => {
    const plan: RunPlan = { requests, rows: parsed, mode, baseVars, defaults };
    const blob = new Blob([JSON.stringify(toNewmanJson(plan, results), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apilab-run-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runnable = requests.length > 0 && !dataError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[92vw] h-[86vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-[var(--color-border)]">
          <DialogTitle className="text-base flex items-center gap-2">
            {t("runner.title")}
            {folder && (
              <span className="text-xs font-normal text-[var(--color-fg-muted)]">
                {folder.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {!folder || requests.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title={t("runner.noRequests")} />
          </div>
        ) : (
          <>
            <div className="px-5 py-3 shrink-0 border-b border-[var(--color-border)] flex flex-col gap-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--color-fg-muted)]">
                  {t("runner.requestCount", { n: String(requests.length) })}
                </span>
                <div className="flex-1" />
                <span className="text-[var(--color-fg-muted)]">{t("runner.mode.label")}</span>
                <div className="flex rounded-md overflow-hidden border border-[var(--color-border)]">
                  {(["sequential", "parallel"] as RunMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={phase === "running"}
                      onClick={() => setMode(m)}
                      className={
                        "px-2.5 py-1 text-2xs " +
                        (mode === m
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]")
                      }
                    >
                      {t(`runner.mode.${m}` as const)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-medium text-[var(--color-fg-muted)]">
                    {t("runner.data.label")}
                  </span>
                  <label className="text-2xs px-2 py-0.5 rounded bg-[var(--color-bg-elev-2)] cursor-pointer hover:bg-[var(--color-bg-elev)]">
                    {t("runner.data.pick")}
                    <input
                      type="file"
                      accept=".csv,.json,text/csv,application/json"
                      className="hidden"
                      onChange={onPickFile}
                    />
                  </label>
                  {parsed.length > 0 && (
                    <span className="text-3xs font-mono text-[var(--color-success)]">
                      {t("runner.data.rows", { n: String(parsed.length) })}
                    </span>
                  )}
                </div>
                <textarea
                  value={dataText}
                  onChange={(e) => onDataChange(e.target.value)}
                  disabled={phase === "running"}
                  placeholder={t("runner.data.placeholder")}
                  rows={3}
                  className="w-full bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] rounded-md px-2 py-1.5 text-2xs font-mono outline-none focus:border-[var(--color-accent)] resize-none"
                />
                {dataError && (
                  <span className="text-3xs text-[var(--color-danger)]">
                    {t("runner.data.parseError", { msg: dataError })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {phase === "running" ? (
                  <Button size="sm" variant="ghost" onClick={() => abortRef.current?.abort()}>
                    {t("runner.cancel")}
                  </Button>
                ) : (
                  <Button size="sm" onClick={run} disabled={!runnable}>
                    {t("runner.run")}
                  </Button>
                )}
                {phase === "done" && (
                  <Button size="sm" variant="ghost" onClick={exportJson}>
                    {t("runner.export")}
                  </Button>
                )}
                {phase === "done" && failedCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={rerunFailed}>
                    {t("runner.rerunFailed", { n: String(failedCount) })}
                  </Button>
                )}
              </div>
            </div>

            {phase === "done" && (
              <div className="shrink-0 max-h-[42%] overflow-auto border-b border-[var(--color-border)]">
                <CollectionRunSummary summary={summary} wallMs={wallMs} />
              </div>
            )}
            {results.length > 0 ? (
              <CollectionRunProgress results={results} iterationCount={iterationCount} />
            ) : (
              <div className="flex-1" />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
