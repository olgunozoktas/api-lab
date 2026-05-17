/** Olgun Özoktaş geliştirdi · API Lab */
import { describe, it, expect, beforeEach } from "vitest";
import { runScript, __resetQuickJSForTesting } from "../scriptSandbox";
import type { RequestSnapshot, ResponseSnapshot } from "../types";

const mkRequest = (over: Partial<RequestSnapshot> = {}): RequestSnapshot => ({
  method: "GET",
  url: "https://example.test/api",
  params: [],
  headers: [{ enabled: true, k: "X-Existing", v: "old" }],
  auth: { type: "none" },
  body: { mode: "json", text: '{"a":1}' },
  gql: { query: "", vars: "" },
  ...over,
});

const mkResponse = (over: Partial<ResponseSnapshot> = {}): ResponseSnapshot => ({
  status: 200,
  statusText: "OK",
  headers: [{ k: "Content-Type", v: "application/json" }],
  body: '{"token":"AT-123","items":[{"id":1},{"id":2}]}',
  contentType: "application/json",
  sizeBytes: 42,
  elapsedMs: 12,
  url: "https://example.test/api",
  transport: "native",
  ...over,
});

beforeEach(() => {
  __resetQuickJSForTesting();
});

describe("runScript — pm.environment", () => {
  it("set + get round-trips a value into the env", async () => {
    const out = await runScript(
      `
      pm.environment.set("greeting", "hello");
      pm.environment.set("count", 42);
      `,
      { request: mkRequest(), env: {} }
    );
    expect(out.error).toBeUndefined();
    expect(out.env.greeting).toBe("hello");
    expect(out.env.count).toBe("42");
  });

  it("get reads pre-existing env vars", async () => {
    const out = await runScript(
      `
      const v = pm.environment.get("token");
      pm.environment.set("echoed", v);
      `,
      { request: mkRequest(), env: { token: "secret" } }
    );
    expect(out.env.echoed).toBe("secret");
  });

  it("unset removes a key", async () => {
    const out = await runScript(`pm.environment.unset("a");`, {
      request: mkRequest(),
      env: { a: "1", b: "2" },
    });
    expect(out.env).toEqual({ b: "2" });
  });
});

describe("runScript — pm.request mutations", () => {
  it("headers.upsert overwrites an existing header case-insensitively", async () => {
    const out = await runScript(`pm.request.headers.upsert({key: "x-existing", value: "new"});`, {
      request: mkRequest(),
      env: {},
    });
    expect(out.request.headers).toEqual([{ enabled: true, k: "x-existing", v: "new" }]);
  });

  it("headers.add appends without dedup", async () => {
    const out = await runScript(`pm.request.headers.add({key: "X-Trace", value: "abc"});`, {
      request: mkRequest(),
      env: {},
    });
    expect(out.request.headers).toHaveLength(2);
    expect(out.request.headers[1]).toEqual({
      enabled: true,
      k: "X-Trace",
      v: "abc",
    });
  });

  it("body.update accepts string or object", async () => {
    const out = await runScript(`pm.request.body.update({hello: "world"});`, {
      request: mkRequest(),
      env: {},
    });
    expect(out.request.body.text).toBe('{"hello":"world"}');
  });
});

describe("runScript — pm.response", () => {
  it("response.json() parses the body", async () => {
    const out = await runScript(
      `
      const j = pm.response.json();
      pm.environment.set("token", j.token);
      pm.environment.set("count", String(j.items.length));
      `,
      { request: mkRequest(), env: {}, response: mkResponse() }
    );
    expect(out.error).toBeUndefined();
    expect(out.env.token).toBe("AT-123");
    expect(out.env.count).toBe("2");
  });

  it("response.headers.get is case-insensitive", async () => {
    const out = await runScript(
      `pm.environment.set("ct", pm.response.headers.get("content-type"));`,
      { request: mkRequest(), env: {}, response: mkResponse() }
    );
    expect(out.env.ct).toBe("application/json");
  });

  it("response.code reflects status", async () => {
    const out = await runScript(`pm.environment.set("code", String(pm.response.code));`, {
      request: mkRequest(),
      env: {},
      response: mkResponse({ status: 418 }),
    });
    expect(out.env.code).toBe("418");
  });
});

describe("runScript — pm.test + pm.expect (chai-style)", () => {
  it("captures passing and failing assertions", async () => {
    const out = await runScript(
      `
      pm.test("status is 200", function() {
        pm.expect(pm.response.code).to.equal(200);
      });
      pm.test("body has token", function() {
        const j = pm.response.json();
        pm.expect(j).to.have.property("token");
      });
      pm.test("status check fails when wrong", function() {
        pm.expect(pm.response.code).to.equal(999);
      });
      `,
      { request: mkRequest(), env: {}, response: mkResponse() }
    );
    expect(out.asserts).toHaveLength(3);
    expect(out.asserts[0].passed).toBe(true);
    expect(out.asserts[1].passed).toBe(true);
    expect(out.asserts[2].passed).toBe(false);
    expect(out.asserts[2].error).toContain("999");
  });

  it("expect(...).to.have.status reads response status", async () => {
    const out = await runScript(
      `pm.test("status", function() { pm.expect(pm.response).to.have.status(200); });`,
      { request: mkRequest(), env: {}, response: mkResponse() }
    );
    expect(out.asserts[0].passed).toBe(true);
  });

  it("expect(...).to.include works on strings and arrays", async () => {
    const out = await runScript(
      `
      pm.test("string includes", function() { pm.expect("hello world").to.include("world"); });
      pm.test("array includes", function() { pm.expect([1,2,3]).to.include(2); });
      `,
      { request: mkRequest(), env: {} }
    );
    expect(out.asserts.every((a) => a.passed)).toBe(true);
  });
});

describe("runScript — pm.variables.replaceIn", () => {
  it("substitutes {{var}} placeholders from env", async () => {
    const out = await runScript(
      `pm.environment.set("rendered", pm.variables.replaceIn("Hello {{name}} from {{city}}"));`,
      { request: mkRequest(), env: { name: "Olgun", city: "Istanbul" } }
    );
    expect(out.env.rendered).toBe("Hello Olgun from Istanbul");
  });
});

describe("runScript — sandbox isolation", () => {
  it("has no fetch, XHR, or WebSocket", async () => {
    const out = await runScript(
      `
      pm.environment.set("hasFetch", String(typeof fetch !== "undefined"));
      pm.environment.set("hasXHR", String(typeof XMLHttpRequest !== "undefined"));
      pm.environment.set("hasWS", String(typeof WebSocket !== "undefined"));
      `,
      { request: mkRequest(), env: {} }
    );
    expect(out.env.hasFetch).toBe("false");
    expect(out.env.hasXHR).toBe("false");
    expect(out.env.hasWS).toBe("false");
  });

  it("cannot reach window or globalThis.localStorage", async () => {
    const out = await runScript(
      `
      pm.environment.set("hasWindow", String(typeof window !== "undefined"));
      pm.environment.set("hasLS", String(typeof localStorage !== "undefined"));
      `,
      { request: mkRequest(), env: {} }
    );
    expect(out.env.hasWindow).toBe("false");
    expect(out.env.hasLS).toBe("false");
  });

  it("infinite loop is interrupted by CPU deadline", async () => {
    const out = await runScript(
      `while (true) { /* spin */ }`,
      {
        request: mkRequest(),
        env: {},
      },
      { cpuMs: 50 }
    );
    expect(out.error).toBeDefined();
    expect((out.error || "").toLowerCase()).toMatch(/timed out|interrupted/);
  }, 5000);

  it("aggressive memory pressure does not crash the host", async () => {
    // We don't assert that QuickJS's memory limiter catches this
    // exact pattern (strict tracking varies by allocator path).
    // What matters for sandbox safety: even a script that tries to
    // allocate hundreds of MB doesn't kill the test runner. The
    // sandbox returns a result either way (success, asserts, error).
    const out = await runScript(
      `
      try {
        let s = "x";
        for (let i = 0; i < 22; i++) s = s + s;
        pm.environment.set("len", String(s.length));
      } catch (e) {
        pm.environment.set("oom", e.message || String(e));
      }
      `,
      { request: mkRequest(), env: {} },
      { memoryBytes: 1 * 1024 * 1024, cpuMs: 2000 }
    );
    // Either path is fine — what matters is that runScript returned.
    expect(out).toBeDefined();
    expect(out.env).toBeDefined();
  }, 10000);
});

describe("runScript — error handling", () => {
  it("captures user script exceptions without throwing", async () => {
    const out = await runScript(`throw new Error("boom");`, { request: mkRequest(), env: {} });
    // User-thrown errors land in console_log + asserts (script-level fail)
    // since our preamble wraps user code in try/catch.
    expect(out.console_log.some((l) => l.includes("boom"))).toBe(true);
  });

  it("empty script returns state untouched", async () => {
    const initial = { request: mkRequest(), env: { x: "1" } };
    const out = await runScript("", initial);
    expect(out.error).toBeUndefined();
    expect(out.env).toEqual({ x: "1" });
    expect(out.request.headers).toEqual(initial.request.headers);
  });

  it("whitespace-only script is treated as empty", async () => {
    const out = await runScript("   \n\t  ", {
      request: mkRequest(),
      env: {},
    });
    expect(out.error).toBeUndefined();
    expect(out.asserts).toEqual([]);
  });
});

describe("runScript — console capture", () => {
  it("collects console.log calls", async () => {
    const out = await runScript(
      `
      console.log("step 1");
      console.log("count is", 5);
      console.warn("warn1");
      console.error("err1");
      `,
      { request: mkRequest(), env: {} }
    );
    expect(out.console_log).toEqual(["step 1", "count is 5", "[warn] warn1", "[error] err1"]);
  });
});

describe("runScript — pm.iterationData", () => {
  it("get reads a value from the iteration row", async () => {
    const out = await runScript(`pm.environment.set("echo", pm.iterationData.get("userId"));`, {
      request: mkRequest(),
      env: {},
      iterationData: { userId: "u-42", role: "admin" },
    });
    expect(out.error).toBeUndefined();
    expect(out.env.echo).toBe("u-42");
  });

  it("get returns undefined for an absent key", async () => {
    const out = await runScript(
      `pm.environment.set("missing", String(pm.iterationData.get("nope")));`,
      { request: mkRequest(), env: {}, iterationData: { a: "1" } }
    );
    expect(out.env.missing).toBe("undefined");
  });

  it("toObject exposes the whole iteration row", async () => {
    const out = await runScript(
      `pm.environment.set("keys", Object.keys(pm.iterationData.toObject()).sort().join(","));`,
      { request: mkRequest(), env: {}, iterationData: { b: "2", a: "1" } }
    );
    expect(out.env.keys).toBe("a,b");
  });

  it("is safe when no iteration data is supplied", async () => {
    const out = await runScript(`pm.environment.set("v", String(pm.iterationData.get("x")));`, {
      request: mkRequest(),
      env: {},
    });
    expect(out.error).toBeUndefined();
    expect(out.env.v).toBe("undefined");
  });
});
