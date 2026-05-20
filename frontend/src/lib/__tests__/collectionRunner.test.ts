/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  PARALLEL_CONCURRENCY,
  runCollection,
  summarize,
  toNewmanJson,
  resolveFolderRequests,
  type RunnableRequest,
  type RunPlan,
  type SendFn,
} from "../collectionRunner";
import { emptyRequest, defaultRequestDefaults } from "../types";
import type { CollectionItem, CurrentRequest, ScriptAssert } from "../types";

function runnable(id: string): RunnableRequest {
  return {
    id,
    name: id,
    isGraphql: false,
    request: { ...emptyRequest(), url: `http://x/${id}` },
  };
}

type Behavior = {
  status?: number;
  asserts?: ScriptAssert[];
  scriptError?: string;
  throws?: boolean;
};

// Build a fake send keyed on the request id (last URL segment).
function makeSend(byId: Record<string, Behavior>): SendFn {
  return async (request: CurrentRequest) => {
    const id = request.url.split("/").pop() ?? "";
    const b = byId[id] ?? {};
    if (b.throws) throw new Error("network down");
    return {
      response: {
        status: b.status ?? 200,
        statusText: "OK",
        headers: [],
        body: "",
        contentType: "application/json",
        sizeBytes: 0,
        elapsedMs: 10,
        url: request.url,
        transport: "native" as const,
      },
      postScript:
        b.asserts || b.scriptError
          ? { asserts: b.asserts ?? [], console_log: [], error: b.scriptError }
          : undefined,
      request,
      env: {},
    };
  };
}

function plan(requests: RunnableRequest[], rows: Record<string, string>[] = []): RunPlan {
  return { requests, rows, mode: "sequential", baseVars: {}, defaults: defaultRequestDefaults() };
}

describe("runCollection — status classification", () => {
  it("marks a request pass when every assertion is green", async () => {
    const send = makeSend({ a: { asserts: [{ name: "ok", passed: true }] } });
    const out = await runCollection(plan([runnable("a")]), { send });
    expect(out[0].status).toBe("pass");
  });

  it("marks a request fail when any assertion is red", async () => {
    const send = makeSend({
      a: {
        asserts: [
          { name: "ok", passed: true },
          { name: "bad", passed: false, error: "nope" },
        ],
      },
    });
    const out = await runCollection(plan([runnable("a")]), { send });
    expect(out[0].status).toBe("fail");
    expect(out[0].asserts).toHaveLength(2);
  });

  it("marks a request error on a thrown network failure", async () => {
    const send = makeSend({ a: { throws: true } });
    const out = await runCollection(plan([runnable("a")]), { send });
    expect(out[0].status).toBe("error");
    expect(out[0].error).toMatch(/network down/);
  });

  it("marks a request error on a status-0 response", async () => {
    const send = makeSend({ a: { status: 0 } });
    const out = await runCollection(plan([runnable("a")]), { send });
    expect(out[0].status).toBe("error");
  });

  it("marks a request error on a crashed script", async () => {
    const send = makeSend({ a: { scriptError: "ReferenceError: x" } });
    const out = await runCollection(plan([runnable("a")]), { send });
    expect(out[0].status).toBe("error");
  });
});

describe("runCollection — iterations", () => {
  it("fires request × iteration cells (2 requests, 3 rows → 6)", async () => {
    const send = makeSend({});
    const rows = [{ n: "1" }, { n: "2" }, { n: "3" }];
    const out = await runCollection(plan([runnable("a"), runnable("b")], rows), { send });
    expect(out).toHaveLength(6);
    expect(out.filter((r) => r.iteration === 0)).toHaveLength(2);
  });

  it("runs once with an empty row when no iteration data is given", async () => {
    const send = makeSend({});
    const out = await runCollection(plan([runnable("a")]), { send });
    expect(out).toHaveLength(1);
    expect(out[0].iteration).toBe(0);
  });

  it("parallel mode produces the same cell count as sequential", async () => {
    const send = makeSend({});
    const p: RunPlan = { ...plan([runnable("a"), runnable("b")], [{ n: "1" }]), mode: "parallel" };
    const out = await runCollection(p, { send });
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.status === "pass")).toBe(true);
  });

  it("workList: only fires the listed (request, iteration) pairs", async () => {
    // 2-request × 2-iteration plan, but the runner is told to fire
    // exactly one cell. Returned results should contain only that
    // cell — mirrors how "Re-run failed" calls back in: the caller
    // merges results into its prior list rather than replacing it.
    const fired: string[] = [];
    const send: SendFn = async (request) => {
      fired.push(request.url);
      return {
        response: {
          status: 200,
          statusText: "OK",
          headers: [],
          body: "",
          contentType: "application/json",
          sizeBytes: 0,
          elapsedMs: 0,
          url: request.url,
          transport: "native" as const,
        },
        request,
        env: {},
      };
    };
    const p: RunPlan = {
      ...plan([runnable("a"), runnable("b")], [{ n: "0" }, { n: "1" }]),
      mode: "sequential",
      workList: [{ requestId: "b", iteration: 1 }],
    };
    const out = await runCollection(p, { send });
    expect(out).toHaveLength(1);
    expect(out[0].requestId).toBe("b");
    expect(out[0].iteration).toBe(1);
    expect(fired).toEqual(["http://x/b"]);
  });

  it("workList: unknown requestId / out-of-range iteration is silently skipped", async () => {
    const send = makeSend({});
    const p: RunPlan = {
      ...plan([runnable("a")], [{}]),
      workList: [
        { requestId: "a", iteration: 0 }, // valid
        { requestId: "ghost", iteration: 0 }, // unknown id
        { requestId: "a", iteration: 99 }, // out of range
      ],
    };
    const out = await runCollection(p, { send });
    expect(out).toHaveLength(1);
    expect(out[0].requestId).toBe("a");
  });

  it("parallel mode never has more than PARALLEL_CONCURRENCY sends in flight", async () => {
    // Instrument `send` with an in-flight counter — each call holds
    // a microtask gate via setTimeout(0) so the next worker has a
    // chance to pick up before this one resolves. Without that the
    // synchronous fake-send would finish before any concurrency
    // could build up and the test would pass trivially.
    let inFlight = 0;
    let peak = 0;
    const send: SendFn = async (request) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      return {
        response: {
          status: 200,
          statusText: "OK",
          headers: [],
          body: "",
          contentType: "application/json",
          sizeBytes: 0,
          elapsedMs: 0,
          url: request.url,
          transport: "native" as const,
        },
        request,
        env: {},
      };
    };
    // 500 cells (the parent backlog's worst-case shape: 10 requests
    // × 50 CSV rows). Without the bounded pool peak would be 500.
    const requests = Array.from({ length: 10 }, (_, i) => runnable(`r${i}`));
    const rows = Array.from({ length: 50 }, (_, i) => ({ idx: String(i) }));
    const p: RunPlan = { ...plan(requests, rows), mode: "parallel" };
    await runCollection(p, { send });
    expect(peak).toBeLessThanOrEqual(PARALLEL_CONCURRENCY);
    // Sanity-check that we DID build up some real concurrency —
    // catches a regression where the cap collapses to 1.
    expect(peak).toBeGreaterThan(1);
  });

  it("fires onProgress as cells change state", async () => {
    const send = makeSend({});
    let calls = 0;
    await runCollection(plan([runnable("a")]), { send, onProgress: () => calls++ });
    expect(calls).toBeGreaterThan(1);
  });
});

describe("summarize", () => {
  it("aggregates pass / fail / error and assertion counts", async () => {
    const send = makeSend({
      a: { asserts: [{ name: "x", passed: true }] },
      b: { asserts: [{ name: "y", passed: false }] },
      c: { throws: true },
    });
    const out = await runCollection(plan([runnable("a"), runnable("b"), runnable("c")]), { send });
    const s = summarize(out);
    expect(s.passed).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.errored).toBe(1);
    expect(s.assertsPassed).toBe(1);
    expect(s.assertsFailed).toBe(1);
    expect(s.perRequest).toHaveLength(3);
  });
});

describe("resolveFolderRequests", () => {
  const item = (over: Partial<CollectionItem>): CollectionItem => ({
    id: "x",
    parentId: null,
    kind: "request",
    name: "x",
    order: 0,
    request: emptyRequest(),
    ...over,
  });

  it("flattens a folder's requests in sibling order, recursing sub-folders", () => {
    const items: CollectionItem[] = [
      item({ id: "f", kind: "folder", name: "F", request: undefined }),
      item({ id: "r2", parentId: "f", name: "r2", order: 1 }),
      item({ id: "r1", parentId: "f", name: "r1", order: 0 }),
      item({ id: "sub", parentId: "f", kind: "folder", name: "Sub", order: 2, request: undefined }),
      item({ id: "r3", parentId: "sub", name: "r3", order: 0 }),
    ];
    const out = resolveFolderRequests(items, "f");
    expect(out.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
  });

  it("returns an empty list for a folder with no requests", () => {
    const items: CollectionItem[] = [
      item({ id: "f", kind: "folder", name: "F", request: undefined }),
    ];
    expect(resolveFolderRequests(items, "f")).toEqual([]);
  });
});

describe("toNewmanJson", () => {
  it("produces a Newman-shaped stats + executions block", async () => {
    const send = makeSend({ a: { asserts: [{ name: "x", passed: false }] } });
    const p = plan([runnable("a")], [{ n: "1" }, { n: "2" }]);
    const out = await runCollection(p, { send });
    const json = toNewmanJson(p, out) as {
      run: {
        stats: { requests: { total: number }; assertions: { failed: number } };
        executions: unknown[];
        failures: unknown[];
      };
    };
    expect(json.run.stats.requests.total).toBe(2);
    expect(json.run.stats.assertions.failed).toBe(2);
    expect(json.run.executions).toHaveLength(2);
    expect(json.run.failures).toHaveLength(2);
  });
});
