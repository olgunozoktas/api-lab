/** Olgun Özoktaş geliştirdi · API Lab */
import { bridge } from "./bridge";
import type { HttpHeader, HttpResponse } from "./bridge";
import type { CurrentRequest, RequestDefaults, ResponseSnapshot } from "./types";
import { defaultRequestDefaults } from "./types";
import { envSubst } from "./utils";
import { runScript, type ScriptAssert } from "./scriptSandbox";

export type ScriptOutcome = {
  asserts: ScriptAssert[];
  console_log: string[];
  error?: string;
};

export type SendResult = {
  response: ResponseSnapshot;
  preScript?: ScriptOutcome;
  postScript?: ScriptOutcome;
  request: CurrentRequest;
  env: Record<string, string>;
};

export function buildHeadersList(req: CurrentRequest, vars: Record<string, string>): Headers {
  const out = new Headers();
  for (const h of req.headers) {
    if (!h.enabled || !h.k) continue;
    try {
      out.append(envSubst(h.k, vars), envSubst(h.v, vars));
    } catch {
      /* invalid */
    }
  }
  const a = req.auth;
  if (a.type === "bearer" && a.token) {
    out.set("Authorization", "Bearer " + envSubst(a.token, vars));
  } else if (a.type === "basic" && (a.user || a.pass)) {
    out.set(
      "Authorization",
      "Basic " + btoa(envSubst(a.user || "", vars) + ":" + envSubst(a.pass || "", vars))
    );
  } else if (a.type === "apikey" && a.header && a.value) {
    out.set(envSubst(a.header, vars), envSubst(a.value, vars));
  } else if (a.type === "oauth2" && a.oauth2?.access_token) {
    // OAuth 2.0 (helper variant) — inject Bearer + access_token. Token
    // refresh is a separate user-driven action via the AuthPanel; if the
    // token is expired we still send it (server returns 401 → user clicks
    // Refresh → resends). The full popup flow is a backlog follow-up.
    out.set("Authorization", "Bearer " + envSubst(a.oauth2.access_token, vars));
  }
  return out;
}

export function buildUrl(req: CurrentRequest, vars: Record<string, string>): string {
  let url = envSubst(req.url, vars);
  const params = req.params.filter((r) => r.enabled && r.k);
  if (params.length === 0) return url;
  const qs = params
    .map(
      (r) => encodeURIComponent(envSubst(r.k, vars)) + "=" + encodeURIComponent(envSubst(r.v, vars))
    )
    .join("&");
  return url + (url.includes("?") ? "&" : "?") + qs;
}

export function buildBody(
  req: CurrentRequest,
  isGraphql: boolean,
  vars: Record<string, string>
): string | undefined {
  if (isGraphql) {
    let parsedVars: unknown = {};
    try {
      parsedVars = req.gql.vars ? JSON.parse(envSubst(req.gql.vars, vars)) : {};
    } catch {
      /* keep empty */
    }
    return JSON.stringify({ query: envSubst(req.gql.query, vars), variables: parsedVars });
  }
  if (req.body.mode === "none") return undefined;
  return envSubst(req.body.text, vars);
}

export function effectiveContentType(
  req: CurrentRequest,
  isGraphql: boolean,
  headers: Headers
): void {
  if (isGraphql) {
    headers.set("Content-Type", "application/json");
    return;
  }
  if (req.body.mode === "json" && req.body.text && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  } else if (req.body.mode === "form" && req.body.text) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  }
}

// Standard browser AbortError shape so callers can `e.name === "AbortError"`.
export function makeAbortError(): DOMException {
  return new DOMException("Request cancelled", "AbortError");
}

async function viaNative(
  url: string,
  method: string,
  headers: Headers,
  body: string | undefined,
  defaults: RequestDefaults,
  signal?: AbortSignal
): Promise<ResponseSnapshot> {
  // Soft cancel: the zero-native bridge dispatches synchronously on the
  // main thread — an in-flight `http.request` blocks the bridge thread
  // until curl returns, so we cannot send a separate `http.cancel` IPC
  // call to kill the subprocess (a real cancel needs bridge AsyncHandler
  // support, queued as a follow-up). When the signal aborts, throw
  // AbortError immediately so the UI returns to ready; the bridge call's
  // eventual response is discarded by JS but the curl subprocess keeps
  // running until natural completion (timeout or success).
  if (signal?.aborted) throw makeAbortError();
  const headerArr: HttpHeader[] = [];
  headers.forEach((v, k) => headerArr.push({ name: k, value: v }));
  const bridgePromise = bridge.invoke<HttpResponse>("http.request", {
    method,
    url,
    headers: headerArr,
    body: body ?? null,
    timeout_ms: defaults.timeoutMs,
    follow_redirects: defaults.followRedirects,
    insecure: defaults.insecure,
  });
  const r: HttpResponse = signal
    ? await Promise.race([
        bridgePromise,
        new Promise<HttpResponse>((_, reject) => {
          if (signal.aborted) return reject(makeAbortError());
          signal.addEventListener("abort", () => reject(makeAbortError()), { once: true });
        }),
      ])
    : await bridgePromise;
  if (r.error) {
    throw new Error(r.error + (r.stderr ? " — " + r.stderr : ""));
  }
  const respHeaders = (r.headers || []).map((h) => ({ k: h.name, v: h.value }));
  const ct = (r.headers || []).find((h) => h.name.toLowerCase() === "content-type")?.value || "";
  return {
    status: r.status,
    statusText: "",
    headers: respHeaders,
    body: r.body || "",
    contentType: ct,
    sizeBytes: r.size_bytes ?? r.body?.length ?? 0,
    elapsedMs: r.timing_ms ?? r.timing?.total_ms ?? 0,
    url: r.url || url,
    transport: "native",
    timing: r.timing,
  };
}

async function viaFetch(
  url: string,
  method: string,
  headers: Headers,
  body: string | undefined,
  t0: number,
  signal?: AbortSignal
): Promise<ResponseSnapshot> {
  const res = await fetch(url, { method, headers, body, redirect: "follow", signal });
  const respHeaders: { k: string; v: string }[] = [];
  res.headers.forEach((v, k) => respHeaders.push({ k, v }));
  let buf: ArrayBuffer;
  try {
    buf = await res.arrayBuffer();
  } catch {
    buf = new ArrayBuffer(0);
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  return {
    status: res.status,
    statusText: res.statusText,
    headers: respHeaders,
    body: text,
    contentType: res.headers.get("content-type") || "",
    sizeBytes: buf.byteLength,
    elapsedMs: Math.round(performance.now() - t0),
    url: res.url,
    transport: "fetch",
  };
}

export type SendOptions = {
  /** Aborts the in-flight request when triggered. Fetch path uses
   *  fetch's native signal; native (curl-via-bridge) path soft-cancels
   *  on the JS side because the bridge is synchronous (see viaNative). */
  signal?: AbortSignal;
};

export async function send(
  req: CurrentRequest,
  isGraphql: boolean,
  vars: Record<string, string>,
  defaults: RequestDefaults = defaultRequestDefaults(),
  opts: SendOptions = {}
): Promise<ResponseSnapshot> {
  const result = await sendWithScripts(req, isGraphql, vars, defaults, opts);
  return result.response;
}

// Full send pipeline including pre-/post-request scripts. Pre-script
// can mutate request + env before the HTTP call; post-script reads
// the response + can mutate env. Both have a 5s/10MB sandbox cap.
export async function sendWithScripts(
  req: CurrentRequest,
  isGraphql: boolean,
  vars: Record<string, string>,
  defaults: RequestDefaults = defaultRequestDefaults(),
  opts: SendOptions = {}
): Promise<SendResult> {
  let activeRequest: CurrentRequest = req;
  let activeEnv: Record<string, string> = { ...vars };
  let preOutcome: ScriptOutcome | undefined;

  if (req.preScript && req.preScript.trim()) {
    const result = await runScript(req.preScript, {
      request: req,
      env: activeEnv,
    });
    activeRequest = { ...req, ...result.request };
    activeEnv = result.env;
    preOutcome = {
      asserts: result.asserts,
      console_log: result.console_log,
      error: result.error,
    };
    // If pre-script errored, we still proceed with the HTTP call —
    // mirrors Postman behavior. The error is surfaced in the outcome.
  }

  const url = buildUrl(activeRequest, activeEnv);
  if (!url) throw new Error("URL boş");
  const method = isGraphql ? "POST" : activeRequest.method;
  const headers = buildHeadersList(activeRequest, activeEnv);
  effectiveContentType(activeRequest, isGraphql, headers);
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : buildBody(activeRequest, isGraphql, activeEnv);

  const t0 = performance.now();
  const response = bridge.available
    ? await viaNative(url, method, headers, body, defaults, opts.signal)
    : await viaFetch(url, method, headers, body, t0, opts.signal);

  let postOutcome: ScriptOutcome | undefined;
  if (req.postScript && req.postScript.trim()) {
    const result = await runScript(req.postScript, {
      request: activeRequest,
      env: activeEnv,
      response,
    });
    activeEnv = result.env;
    postOutcome = {
      asserts: result.asserts,
      console_log: result.console_log,
      error: result.error,
    };
  }

  return {
    response,
    preScript: preOutcome,
    postScript: postOutcome,
    request: activeRequest,
    env: activeEnv,
  };
}
