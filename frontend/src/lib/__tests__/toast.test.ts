/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect } from "vitest";
import { enqueueToast, removeToast, TOAST_QUEUE_CAP, type ToastEntry } from "../toast";

function entry(id: string): ToastEntry {
  return { id, msg: id, severity: "info", duration: 3500, ts: 0 };
}

describe("enqueueToast", () => {
  it("appends to the end of the queue", () => {
    const q = enqueueToast([entry("a")], entry("b"));
    expect(q.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("evicts the oldest when over the cap", () => {
    let q: ToastEntry[] = [];
    for (let i = 0; i < TOAST_QUEUE_CAP + 2; i++) q = enqueueToast(q, entry(`t${i}`));
    expect(q).toHaveLength(TOAST_QUEUE_CAP);
    // the two oldest (t0, t1) were dropped
    expect(q[0].id).toBe("t2");
    expect(q[q.length - 1].id).toBe(`t${TOAST_QUEUE_CAP + 1}`);
  });

  it("respects an explicit cap", () => {
    let q: ToastEntry[] = [];
    for (let i = 0; i < 5; i++) q = enqueueToast(q, entry(`t${i}`), 2);
    expect(q.map((t) => t.id)).toEqual(["t3", "t4"]);
  });

  it("does not mutate the input queue", () => {
    const original = [entry("a")];
    enqueueToast(original, entry("b"));
    expect(original).toHaveLength(1);
  });
});

describe("removeToast", () => {
  it("drops the matching toast", () => {
    const q = removeToast([entry("a"), entry("b"), entry("c")], "b");
    expect(q.map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("is a no-op when the id is absent", () => {
    const q = removeToast([entry("a")], "zzz");
    expect(q.map((t) => t.id)).toEqual(["a"]);
  });

  it("does not mutate the input queue", () => {
    const original = [entry("a"), entry("b")];
    removeToast(original, "a");
    expect(original).toHaveLength(2);
  });
});
