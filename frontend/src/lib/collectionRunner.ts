/** Olgun Özoktaş geliştirdi · API Lab */
//
// Collection runner — fires a folder's requests in sequence (or in
// parallel) once per iteration-data row, classifies each call by its
// assertion outcome, and aggregates a summary.
//
// `send` is an injected dependency (defaults to `sendWithScripts`) so
// the engine is unit-testable with a fake — no network in tests.

import type { CollectionItem, CurrentRequest, RequestDefaults, ScriptAssert } from "./types";
import { defaultRequestDefaults } from "./types";
import { sendWithScripts, type SendResult } from "./sendRequest";

export type RunRequestStatus = "pending" | "firing" | "pass" | "fail" | "error";
export type RunMode = "sequential" | "parallel";

// One request resolved from the collection tree, ready to fire.
export type RunnableRequest = {
  id: string;
  name: string;
  request: CurrentRequest;
  isGraphql: boolean;
};

// One (request × iteration) cell of the run, updated live as it fires.
export type RunResultRow = {
  key: string; // `${iteration}::${requestId}` — stable React key
  requestId: string;
  name: string;
  iteration: number; // 0-based row index
  status: RunRequestStatus;
  durationMs: number;
  asserts: ScriptAssert[];
  error?: string;
  responseStatus?: number;
};

export type RunPlan = {
  requests: RunnableRequest[];
  rows: Record<string, string>[]; // iteration rows; [] → one empty row
  mode: RunMode;
  baseVars: Record<string, string>;
  defaults: RequestDefaults;
};

export type SendFn = (
  req: CurrentRequest,
  isGraphql: boolean,
  vars: Record<string, string>,
  defaults: RequestDefaults,
  opts: { signal?: AbortSignal; iterationData?: Record<string, string> }
) => Promise<SendResult>;

export type RunHooks = {
  send?: SendFn;
  onProgress?: (rows: RunResultRow[]) => void;
  signal?: AbortSignal;
};

export type RunSummary = {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  pending: number;
  assertsPassed: number;
  assertsFailed: number;
  totalRequestMs: number; // sum of per-call durations
  perRequest: { requestId: string; name: string; durations: number[]; avgMs: number }[];
};

const now = (): number => globalThis.performance?.now?.() ?? Date.now();

// Classify a completed send by its assertion outcome. A status-0
// response or a crashed pre/post script is `error`; any failed
// assertion is `fail`; otherwise `pass`.
function classify(res: SendResult): {
  status: RunRequestStatus;
  asserts: ScriptAssert[];
  error?: string;
} {
  const asserts = [...(res.preScript?.asserts ?? []), ...(res.postScript?.asserts ?? [])];
  const scriptError = res.preScript?.error || res.postScript?.error;
  if (res.response.status === 0 || scriptError) {
    return { status: "error", asserts, error: scriptError };
  }
  if (asserts.some((a) => !a.passed)) return { status: "fail", asserts };
  return { status: "pass", asserts };
}

// Run a collection. Returns the final per-cell result list; `onProgress`
// fires after every status change so the UI can render live progress.
export async function runCollection(plan: RunPlan, hooks: RunHooks = {}): Promise<RunResultRow[]> {
  const send = hooks.send ?? sendWithScripts;
  const rows = plan.rows.length > 0 ? plan.rows : [{}];

  const work: { req: RunnableRequest; row: Record<string, string>; it: number }[] = [];
  for (let it = 0; it < rows.length; it++) {
    for (const req of plan.requests) work.push({ req, row: rows[it], it });
  }

  const results: RunResultRow[] = work.map((w) => ({
    key: `${w.it}::${w.req.id}`,
    requestId: w.req.id,
    name: w.req.name,
    iteration: w.it,
    status: "pending",
    durationMs: 0,
    asserts: [],
  }));

  const emit = () => hooks.onProgress?.(results.map((r) => ({ ...r })));
  emit();

  const runOne = async (i: number): Promise<void> => {
    if (hooks.signal?.aborted) return;
    const { req, row } = work[i];
    results[i] = { ...results[i], status: "firing" };
    emit();

    const mergedVars = { ...plan.baseVars, ...row };
    const t0 = now();
    try {
      const res = await send(req.request, req.isGraphql, mergedVars, plan.defaults, {
        signal: hooks.signal,
        iterationData: row,
      });
      const wall = now() - t0;
      const { status, asserts, error } = classify(res);
      results[i] = {
        ...results[i],
        status,
        durationMs: Math.round(res.response.elapsedMs || wall),
        asserts,
        error,
        responseStatus: res.response.status,
      };
    } catch (e) {
      results[i] = {
        ...results[i],
        status: "error",
        durationMs: Math.round(now() - t0),
        error: (e as Error).message || String(e),
      };
    }
    emit();
  };

  if (plan.mode === "parallel") {
    await Promise.all(work.map((_, i) => runOne(i)));
  } else {
    for (let i = 0; i < work.length; i++) {
      if (hooks.signal?.aborted) break;
      await runOne(i);
    }
  }
  return results;
}

// Aggregate a finished (or in-progress) run into summary counts.
export function summarize(results: RunResultRow[]): RunSummary {
  let passed = 0;
  let failed = 0;
  let errored = 0;
  let pending = 0;
  let assertsPassed = 0;
  let assertsFailed = 0;
  let totalRequestMs = 0;
  const byReq = new Map<string, { name: string; durations: number[] }>();

  for (const r of results) {
    if (r.status === "pass") passed++;
    else if (r.status === "fail") failed++;
    else if (r.status === "error") errored++;
    else pending++;
    for (const a of r.asserts) a.passed ? assertsPassed++ : assertsFailed++;
    totalRequestMs += r.durationMs;
    const entry = byReq.get(r.requestId) ?? { name: r.name, durations: [] };
    entry.durations.push(r.durationMs);
    byReq.set(r.requestId, entry);
  }

  const perRequest = [...byReq.entries()].map(([requestId, v]) => ({
    requestId,
    name: v.name,
    durations: v.durations,
    avgMs: v.durations.length
      ? Math.round(v.durations.reduce((a, b) => a + b, 0) / v.durations.length)
      : 0,
  }));

  return {
    total: results.length,
    passed,
    failed,
    errored,
    pending,
    assertsPassed,
    assertsFailed,
    totalRequestMs,
    perRequest,
  };
}

// Serialise a finished run into a Newman-JSON-reporter-shaped object —
// a faithful subset (stats / executions / failures / timings) that
// Newman-aware tooling can consume.
export function toNewmanJson(plan: RunPlan, results: RunResultRow[]): object {
  const summary = summarize(results);
  const iterations = plan.rows.length || 1;
  return {
    collection: { info: { name: "API Lab collection run" } },
    run: {
      stats: {
        iterations: { total: iterations, pending: 0, failed: 0 },
        requests: { total: summary.total, pending: summary.pending, failed: summary.errored },
        assertions: {
          total: summary.assertsPassed + summary.assertsFailed,
          pending: 0,
          failed: summary.assertsFailed,
        },
      },
      executions: results.map((r) => ({
        item: { name: r.name },
        iteration: r.iteration,
        response: { code: r.responseStatus ?? 0, responseTime: r.durationMs },
        assertions: r.asserts.map((a) => ({
          assertion: a.name,
          error: a.passed ? null : { message: a.error ?? "" },
        })),
        error: r.status === "error" ? { message: r.error ?? "" } : null,
      })),
      failures: results.flatMap((r) =>
        r.asserts
          .filter((a) => !a.passed)
          .map((a) => ({
            source: { name: r.name },
            error: { test: a.name, message: a.error ?? "" },
          }))
      ),
      timings: {
        responseAverage: summary.total ? Math.round(summary.totalRequestMs / summary.total) : 0,
      },
    },
  };
}

// Convenience for callers that build a plan without explicit defaults.
export function emptyRunDefaults(): RequestDefaults {
  return defaultRequestDefaults();
}

// Flatten a collection folder into an ordered, runnable request list —
// recurses into sub-folders, sibling `order` preserved, folders + the
// (rare) request item with no payload skipped.
export function resolveFolderRequests(
  items: CollectionItem[],
  folderId: string
): RunnableRequest[] {
  const out: RunnableRequest[] = [];
  const walk = (parentId: string) => {
    const children = items.filter((i) => i.parentId === parentId).sort((a, b) => a.order - b.order);
    for (const c of children) {
      if (c.kind === "folder") {
        walk(c.id);
      } else if (c.kind === "request" && c.request) {
        out.push({
          id: c.id,
          name: c.name,
          isGraphql: !!c.request.isGraphql,
          request: { ...c.request, id: c.id, name: c.name },
        });
      }
    }
  };
  walk(folderId);
  return out;
}
