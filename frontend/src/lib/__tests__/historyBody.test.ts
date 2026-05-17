/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import {
  applyBodyBudget,
  extractRetainableBody,
  byteLength,
  HISTORY_BODY_MAX_BYTES,
  HISTORY_BODY_BUDGET_BYTES,
} from "../historyBody";
import type { HistoryItem, ResponseSnapshot } from "../types";

function snapshot(over: Partial<ResponseSnapshot> = {}): ResponseSnapshot {
  return {
    status: 200,
    statusText: "OK",
    headers: [],
    body: "{}",
    contentType: "application/json",
    sizeBytes: 2,
    elapsedMs: 5,
    url: "http://x",
    transport: "native",
    ...over,
  };
}

function entry(
  body: string | undefined,
  omitted?: HistoryItem["response"]["bodyOmitted"]
): HistoryItem {
  return {
    id: Math.random().toString(36),
    ts: Date.now(),
    request: {
      method: "GET",
      url: "http://x",
      params: [],
      headers: [],
      auth: { type: "none" },
      body: { mode: "none", text: "" },
      gql: { query: "", vars: "" },
    },
    response: { status: 200, sizeBytes: 0, elapsedMs: 1, body, bodyOmitted: omitted },
  };
}

describe("byteLength", () => {
  it("counts UTF-8 bytes, not code units", () => {
    expect(byteLength("abc")).toBe(3);
    expect(byteLength("é")).toBe(2);
    expect(byteLength("😀")).toBe(4);
  });
});

describe("extractRetainableBody", () => {
  it("retains a small text body with its content type", () => {
    const r = extractRetainableBody(snapshot({ body: '{"a":1}', contentType: "application/json" }));
    expect(r.body).toBe('{"a":1}');
    expect(r.contentType).toBe("application/json");
    expect(r.bodyOmitted).toBeUndefined();
  });

  it("omits binary responses (bodyBase64)", () => {
    const r = extractRetainableBody(snapshot({ bodyBase64: "AAAA" }));
    expect(r.body).toBeUndefined();
    expect(r.bodyOmitted).toBe("binary");
  });

  it("omits binary responses flagged too-large by the bridge", () => {
    const r = extractRetainableBody(snapshot({ bodyTooLarge: true }));
    expect(r.bodyOmitted).toBe("binary");
  });

  it("omits a body over the per-entry cap", () => {
    const big = "x".repeat(HISTORY_BODY_MAX_BYTES + 1);
    const r = extractRetainableBody(snapshot({ body: big }));
    expect(r.body).toBeUndefined();
    expect(r.bodyOmitted).toBe("too-large");
  });

  it("retains a body exactly at the per-entry cap", () => {
    const atCap = "x".repeat(HISTORY_BODY_MAX_BYTES);
    const r = extractRetainableBody(snapshot({ body: atCap }));
    expect(r.body).toBe(atCap);
  });
});

describe("applyBodyBudget", () => {
  it("keeps every body when the total is under budget", () => {
    const items = [entry("aaa"), entry("bbb"), entry("ccc")];
    const out = applyBodyBudget(items);
    expect(out.map((i) => i.response.body)).toEqual(["aaa", "bbb", "ccc"]);
  });

  it("evicts older bodies once the budget is crossed, newest first kept", () => {
    // Each body is 0.4 of the budget — the first two fit (0.8 of the
    // budget), the third tips the running sum past 1.0 → evicted.
    const chunk = "x".repeat(HISTORY_BODY_BUDGET_BYTES * 0.4);
    const items = [entry(chunk), entry(chunk), entry(chunk)];
    const out = applyBodyBudget(items);
    expect(out[0].response.body).toBe(chunk);
    expect(out[1].response.body).toBe(chunk);
    expect(out[2].response.body).toBeUndefined();
    expect(out[2].response.bodyOmitted).toBe("budget");
  });

  it("marks every entry older than the one that tipped the budget", () => {
    const chunk = "x".repeat(HISTORY_BODY_BUDGET_BYTES * 0.7);
    const items = [entry(chunk), entry(chunk), entry("small"), entry("tiny")];
    const out = applyBodyBudget(items);
    expect(out[0].response.body).toBe(chunk);
    expect(out[1].response.body).toBeUndefined();
    expect(out[1].response.bodyOmitted).toBe("budget");
    expect(out[2].response.body).toBeUndefined();
    expect(out[2].response.bodyOmitted).toBe("budget");
    expect(out[3].response.body).toBeUndefined();
    expect(out[3].response.bodyOmitted).toBe("budget");
  });

  it("leaves body-less entries untouched", () => {
    const items = [entry(undefined, "binary"), entry("kept")];
    const out = applyBodyBudget(items);
    expect(out[0].response.bodyOmitted).toBe("binary");
    expect(out[1].response.body).toBe("kept");
  });
});
