import { describe, it, expect, beforeEach, vi } from "vitest";
import { send, makeAbortError } from "../sendRequest";
import type { CurrentRequest } from "../types";

// Build a minimal CurrentRequest for the fetch path. The send pipeline
// exits to viaFetch when bridge.available is false (vitest jsdom env
// has no window.zero), so these tests exercise the AbortSignal threading
// without needing to mock the bridge.
function makeRequest(url: string): CurrentRequest {
  return {
    id: null,
    name: "test",
    method: "GET",
    url,
    params: [],
    headers: [],
    auth: { type: "none" },
    body: { mode: "none", text: "" },
    gql: { query: "", vars: "" },
  };
}

describe("makeAbortError", () => {
  it("produces a DOMException with name 'AbortError'", () => {
    const err = makeAbortError();
    expect(err).toBeInstanceOf(DOMException);
    expect(err.name).toBe("AbortError");
  });
});

describe("send: AbortSignal threading on the fetch path", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Each test installs its own fetch; restore in afterEach via spy.
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  it("rejects with AbortError when the signal is already aborted", async () => {
    // fetch must not be reached — already-aborted signal should reject
    // immediately via the browser's native AbortSignal handling. The
    // fetch impl receives the signal in init and throws synchronously
    // (the browser-native semantics we're piggybacking on). Stub it
    // to throw on call so the assertion still fires if we somehow
    // reach it without aborting first.
    fetchSpy.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) throw makeAbortError();
      throw new Error("fetch should not have been reached without abort propagating");
    });
    const ac = new AbortController();
    ac.abort();
    await expect(
      send(makeRequest("https://example.com"), false, {}, undefined, { signal: ac.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("propagates abort when triggered mid-flight", async () => {
    // fetch returns a never-resolving promise. The race in viaFetch
    // is implicit (the browser's fetch honors the signal), so we
    // simulate that by rejecting when the signal aborts.
    fetchSpy.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(makeAbortError()));
        })
    );
    const ac = new AbortController();
    const promise = send(makeRequest("https://example.com"), false, {}, undefined, {
      signal: ac.signal,
    });
    setTimeout(() => ac.abort(), 5);
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("forwards the AbortSignal to fetch's RequestInit", async () => {
    fetchSpy.mockImplementation(async () => new Response("{}", { status: 200 }));
    const ac = new AbortController();
    await send(makeRequest("https://example.com"), false, {}, undefined, {
      signal: ac.signal,
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBe(ac.signal);
  });

  it("works without a signal (back-compat for legacy callers)", async () => {
    fetchSpy.mockImplementation(async () => new Response("{}", { status: 200 }));
    await expect(send(makeRequest("https://example.com"), false, {})).resolves.toMatchObject({
      status: 200,
    });
  });
});
