/** Olgun Özoktaş geliştirdi · API Lab */
// QuickJS-backed sandbox for pre/post-request scripts.
//
// Strategy: instead of live-binding host functions into the sandbox,
// we serialize state in (request + env + optional response), run the
// user script with a JS-only `pm.*` shim that mutates an internal
// state object, then re-serialize back out. Result: no host bridge
// inside the sandbox, no fetch/XHR at all, no live JS object identity
// crossing the boundary, no way to escape.
//
// Limits enforced via QuickJSRuntime:
//   - Wall-clock CPU: 5s (interruptHandler returns true past deadline)
//   - Memory: 10 MB
//   - Max stack: 256 KB
//
// WASM bootstrap is lazy + module-cached. First script eats ~250 KB
// of bundle on demand (code-split target for Phase O.0).

import type { KvRow, RequestSnapshot, ResponseSnapshot, ScriptAssert } from "./types";

export type { ScriptAssert };

export type ScriptInputState = {
  request: RequestSnapshot;
  env: Record<string, string>;
  response?: ResponseSnapshot;
  // One collection-runner iteration row, exposed as `pm.iterationData`.
  iterationData?: Record<string, string>;
};

export type ScriptResult = {
  request: RequestSnapshot;
  env: Record<string, string>;
  response?: ResponseSnapshot;
  asserts: ScriptAssert[];
  console_log: string[];
  error?: string;
};

export type RunOptions = {
  cpuMs?: number;
  memoryBytes?: number;
};

const DEFAULT_CPU_MS = 5000;
const DEFAULT_MEMORY_BYTES = 10 * 1024 * 1024;
const DEFAULT_STACK_BYTES = 256 * 1024;

// QuickJS module is heavy (~250 KB WASM); load once per page.
let _qjsPromise: Promise<unknown> | null = null;
function loadQuickJS(): Promise<unknown> {
  if (_qjsPromise) return _qjsPromise;
  _qjsPromise = import("quickjs-emscripten").then((m) => m.getQuickJS());
  return _qjsPromise;
}

// Reset hook for tests — clears the module cache so unit tests can
// mock the import. Not exported in the production surface.
export function __resetQuickJSForTesting() {
  _qjsPromise = null;
}

// JSON-only `pm.*` shim. Injected as a preamble before the user
// script. Mutates `__state` in place; assertions push to `__asserts`;
// console writes push to `__console_log`. Final line emits a JSON
// blob the host parses back into typed state.
function buildPreamble(): string {
  return `
const __asserts = [];
const __console_log = [];
const __caseLower = (s) => String(s).toLowerCase();

const pm = {
  request: {
    headers: {
      add: function(arg) {
        const k = arg && arg.key !== undefined ? arg.key : arg;
        const v = arg && arg.value !== undefined ? arg.value : "";
        __state.request.headers.push({ enabled: true, k: String(k), v: String(v) });
      },
      upsert: function(arg) {
        const k = arg && arg.key !== undefined ? arg.key : arg;
        const v = arg && arg.value !== undefined ? arg.value : "";
        const target = __caseLower(k);
        for (let i = 0; i < __state.request.headers.length; i++) {
          if (__caseLower(__state.request.headers[i].k) === target) {
            __state.request.headers[i] = { enabled: true, k: String(k), v: String(v) };
            return;
          }
        }
        __state.request.headers.push({ enabled: true, k: String(k), v: String(v) });
      },
      remove: function(key) {
        const target = __caseLower(key);
        __state.request.headers = __state.request.headers.filter(
          h => __caseLower(h.k) !== target
        );
      },
    },
    body: {
      update: function(text) {
        if (typeof text === "object") __state.request.body.text = JSON.stringify(text);
        else __state.request.body.text = String(text);
      },
    },
    url: {
      get: function() { return __state.request.url; },
      set: function(u) { __state.request.url = String(u); },
    },
  },
  environment: {
    get: function(k) {
      const v = __state.env[k];
      return v === undefined ? undefined : v;
    },
    set: function(k, v) { __state.env[String(k)] = v == null ? "" : String(v); },
    has: function(k) { return Object.prototype.hasOwnProperty.call(__state.env, k); },
    unset: function(k) { delete __state.env[String(k)]; },
  },
  variables: {
    replaceIn: function(s) {
      return String(s).replace(/\\{\\{([^}]+)\\}\\}/g, function(_, key) {
        const v = __state.env[key.trim()];
        return v === undefined ? "" : v;
      });
    },
  },
  iterationData: {
    get: function(k) {
      const v = (__state.iterationData || {})[k];
      return v === undefined ? undefined : v;
    },
    toObject: function() { return Object.assign({}, __state.iterationData || {}); },
  },
  response: {
    code: __state.response ? __state.response.status : undefined,
    status: __state.response ? __state.response.status : undefined,
    json: function() {
      if (!__state.response) throw new Error("pm.response is only available in post-request scripts");
      return JSON.parse(__state.response.body);
    },
    text: function() {
      return __state.response ? __state.response.body : "";
    },
    headers: {
      get: function(name) {
        if (!__state.response) return undefined;
        const target = __caseLower(name);
        const found = __state.response.headers.find(function(h) {
          return __caseLower(h.k) === target;
        });
        return found ? found.v : undefined;
      },
    },
    responseTime: __state.response ? __state.response.elapsedMs : undefined,
  },
  test: function(name, fn) {
    try {
      fn();
      __asserts.push({ name: String(name), passed: true });
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      __asserts.push({ name: String(name), passed: false, error: msg });
    }
  },
  expect: function(actual) {
    function fail(msg) { throw new Error(msg); }
    function show(v) {
      try { return JSON.stringify(v); }
      catch (_) { return String(v); }
    }
    return {
      to: {
        equal: function(expected) {
          if (actual !== expected) fail("expected " + show(actual) + " to equal " + show(expected));
        },
        eql: function(expected) {
          if (JSON.stringify(actual) !== JSON.stringify(expected))
            fail("expected " + show(actual) + " to eql " + show(expected));
        },
        be: {
          ok: function() { if (!actual) fail("expected " + show(actual) + " to be ok"); },
          true: function() { if (actual !== true) fail("expected " + show(actual) + " to be true"); },
          false: function() { if (actual !== false) fail("expected " + show(actual) + " to be false"); },
          null: function() { if (actual !== null) fail("expected " + show(actual) + " to be null"); },
          undefined: function() { if (actual !== undefined) fail("expected " + show(actual) + " to be undefined"); },
          a: function(type) {
            var got = Array.isArray(actual) ? "array" : (actual === null ? "null" : typeof actual);
            if (got !== type) fail("expected " + show(actual) + " to be a " + type + " (got " + got + ")");
          },
          an: function(type) {
            var got = Array.isArray(actual) ? "array" : (actual === null ? "null" : typeof actual);
            if (got !== type) fail("expected " + show(actual) + " to be an " + type + " (got " + got + ")");
          },
        },
        have: {
          status: function(expected) {
            const got = __state.response ? __state.response.status : undefined;
            if (got !== expected) fail("expected status " + got + " to equal " + expected);
          },
          property: function(key) {
            if (!actual || actual[key] === undefined) fail("expected " + show(actual) + " to have property " + key);
          },
          length: function(n) {
            if (!actual || actual.length !== n) fail("expected length " + (actual && actual.length) + " to equal " + n);
          },
        },
        include: function(sub) {
          const ok = (typeof actual === "string" && actual.indexOf(sub) >= 0) ||
                     (Array.isArray(actual) && actual.indexOf(sub) >= 0);
          if (!ok) fail("expected " + show(actual) + " to include " + show(sub));
        },
        match: function(re) {
          if (!re.test(String(actual))) fail("expected " + show(actual) + " to match " + String(re));
        },
      },
    };
  },
};

const console = {
  log: function() {
    const args = Array.prototype.slice.call(arguments);
    __console_log.push(args.map(function(a) {
      if (typeof a === "object") { try { return JSON.stringify(a); } catch (_) { return String(a); } }
      return String(a);
    }).join(" "));
  },
  error: function() {
    const args = Array.prototype.slice.call(arguments);
    __console_log.push("[error] " + args.map(String).join(" "));
  },
  warn: function() {
    const args = Array.prototype.slice.call(arguments);
    __console_log.push("[warn] " + args.map(String).join(" "));
  },
  info: function() {
    const args = Array.prototype.slice.call(arguments);
    __console_log.push(args.map(String).join(" "));
  },
};
`;
}

// Minimum runtime type we touch. Avoids bringing the full
// quickjs-emscripten type into our public surface (lazy-import
// keeps it out of the main bundle).
type QuickJSCtx = {
  evalCode: (code: string, filename?: string) => { value?: unknown; error?: unknown };
  dump: (handle: unknown) => unknown;
  unwrapResult: (r: { value?: unknown; error?: unknown }) => unknown;
  global: unknown;
  setProp: (target: unknown, key: string, value: unknown) => void;
  newString: (s: string) => unknown;
  runtime: {
    setMemoryLimit: (b: number) => void;
    setMaxStackSize: (b: number) => void;
    setInterruptHandler: (cb: () => boolean) => void;
  };
  dispose: () => void;
};
type QuickJSModule = {
  newContext: () => QuickJSCtx;
};

function disposeHandle(h: unknown) {
  const handle = h as { dispose?: () => void } | null | undefined;
  if (handle && typeof handle.dispose === "function") handle.dispose();
}

export async function runScript(
  source: string,
  state: ScriptInputState,
  options: RunOptions = {}
): Promise<ScriptResult> {
  if (!source || !source.trim()) {
    return {
      request: state.request,
      env: { ...state.env },
      response: state.response,
      asserts: [],
      console_log: [],
    };
  }

  const cpuMs = options.cpuMs ?? DEFAULT_CPU_MS;
  const memoryBytes = options.memoryBytes ?? DEFAULT_MEMORY_BYTES;

  const QuickJS = (await loadQuickJS()) as QuickJSModule;
  const vm = QuickJS.newContext();
  // Limits are enforced at the runtime level — they apply to every
  // evalCode call against this context.
  vm.runtime.setMemoryLimit(memoryBytes);
  vm.runtime.setMaxStackSize(DEFAULT_STACK_BYTES);
  const deadline = Date.now() + cpuMs;
  vm.runtime.setInterruptHandler(() => Date.now() > deadline);

  // Initial state — a deep clone via JSON so mutations inside the VM
  // can't accidentally leak into the host's objects.
  const initialState = JSON.parse(JSON.stringify(state));
  const stateLiteral = JSON.stringify(initialState);

  const wrapped = `
"use strict";
const __state = ${stateLiteral};
${buildPreamble()}
try {
${source}
} catch (e) {
  __console_log.push("[error] " + (e && e.message ? e.message : String(e)));
  __asserts.push({ name: "<script>", passed: false, error: e && e.message ? e.message : String(e) });
}
JSON.stringify({ state: __state, asserts: __asserts, console_log: __console_log });
`;

  try {
    const result = vm.evalCode(wrapped, "user-script.js");
    if ("error" in result && result.error) {
      const errVal = vm.dump(result.error) as { name?: string; message?: string };
      disposeHandle(result.error);
      return {
        request: state.request,
        env: { ...state.env },
        response: state.response,
        asserts: [],
        console_log: [],
        error: errVal?.message || errVal?.name || JSON.stringify(errVal),
      };
    }
    if (!("value" in result) || !result.value) {
      return {
        request: state.request,
        env: { ...state.env },
        response: state.response,
        asserts: [],
        console_log: [],
        error: "Sandbox returned no value",
      };
    }
    const dumped = vm.dump(result.value);
    disposeHandle(result.value);

    let parsed: {
      state: ScriptInputState;
      asserts: ScriptAssert[];
      console_log: string[];
    };
    try {
      parsed = typeof dumped === "string" ? JSON.parse(dumped) : (dumped as typeof parsed);
    } catch (e) {
      return {
        request: state.request,
        env: { ...state.env },
        response: state.response,
        asserts: [],
        console_log: [],
        error: "Sandbox emitted invalid JSON: " + (e as Error).message,
      };
    }

    return {
      request: parsed.state.request,
      env: parsed.state.env,
      response: parsed.state.response,
      asserts: parsed.asserts || [],
      console_log: parsed.console_log || [],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const interrupted = msg.toLowerCase().includes("interrupted");
    return {
      request: state.request,
      env: { ...state.env },
      response: state.response,
      asserts: [],
      console_log: [],
      error: interrupted ? `Script timed out after ${cpuMs}ms` : msg,
    };
  } finally {
    try {
      vm.dispose();
    } catch {
      /* nothing to do */
    }
  }
}

// Helper: apply a script result's request/env mutations into a
// snapshot pair the caller can persist. Pure — no side effects.
export function applyScriptMutations(
  prev: ScriptInputState,
  result: ScriptResult
): { request: RequestSnapshot; env: Record<string, string>; headers: KvRow[] } {
  return {
    request: result.request,
    env: result.env,
    headers: result.request.headers,
  };
}
