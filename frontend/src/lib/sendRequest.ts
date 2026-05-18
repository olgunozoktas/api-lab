/** Olgun Özoktaş geliştirdi · API Lab */
// The HTTP send pipeline — builds the final URL / headers / body from a
// CurrentRequest, then dispatches over the native bridge (curl, so it's
// CORS-free) or, as a fallback, browser fetch. Auth (Bearer / Basic /
// API-key / AWS SigV4 / mTLS) is resolved here before the request
// leaves; pre/post-request scripts run around the send.
import { bridge } from "./bridge";
import type { HttpHeader, HttpResponse } from "./bridge";
import type { CurrentRequest, RequestDefaults, ResponseSnapshot, ScriptOutcome } from "./types";
import { defaultRequestDefaults } from "./types";
import { envSubst } from "./utils";
import { runScript } from "./scriptSandbox";
import { signRequestV4 } from "./awsSigv4";
import {
  base64ToText,
  bytesToBase64,
  bytesToText,
  isBinaryContentType,
  MAX_BINARY_RAW,
} from "./binaryBody";
import {
  binaryPath as pickBinaryPath,
  buildMultipartWire,
  contentTypeForPath,
  type MultipartWire,
} from "./fileBody";

export type { ScriptOutcome };

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
  // Multipart + binary bodies travel as structured fields / file
  // paths, not a body string — see buildMultipartWire / pickBinaryPath.
  if (req.body.mode === "none" || req.body.mode === "multipart" || req.body.mode === "binary") {
    return undefined;
  }
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
  } else if (req.body.mode === "binary" && req.body.filePath && !headers.has("Content-Type")) {
    // Raw-binary upload — default the Content-Type from the file's
    // extension so the server sees e.g. image/png rather than the
    // curl default. The user can still override via a header.
    headers.set("Content-Type", contentTypeForPath(req.body.filePath));
  }
  // multipart: deliberately no Content-Type set here — curl owns the
  // `multipart/form-data; boundary=...` header when given `-F` args.
}

// Standard browser AbortError shape so callers can `e.name === "AbortError"`.
export function makeAbortError(): DOMException {
  return new DOMException("Request cancelled", "AbortError");
}

type MtlsWire = { certPath?: string; keyPath?: string; passphrase?: string };

async function viaNative(
  url: string,
  method: string,
  headers: Headers,
  body: string | undefined,
  defaults: RequestDefaults,
  signal?: AbortSignal,
  multipart?: MultipartWire[],
  binaryPath?: string,
  mtls?: MtlsWire
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
    ...(multipart && multipart.length > 0 ? { multipart } : {}),
    ...(binaryPath ? { binary_path: binaryPath } : {}),
    ...(defaults.proxyUrl ? { proxy: defaults.proxyUrl } : {}),
    ...(mtls?.certPath ? { client_cert: mtls.certPath } : {}),
    ...(mtls?.keyPath ? { client_key: mtls.keyPath } : {}),
    ...(mtls?.passphrase ? { client_key_pass: mtls.passphrase } : {}),
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

  // Binary response channel: when the native handler flags the body as
  // base64, keep the raw base64 on `bodyBase64` for the rich viewers
  // and decode a lossy-text render into `body` for the Raw tab.
  let bodyText = r.body || "";
  let bodyBase64: string | undefined;
  if (r.body_base64 === true && r.body) {
    bodyBase64 = r.body;
    try {
      bodyText = base64ToText(r.body);
    } catch {
      bodyText = "";
    }
  }

  return {
    status: r.status,
    statusText: "",
    headers: respHeaders,
    body: bodyText,
    bodyBase64,
    bodyTooLarge: r.body_too_large === true ? true : undefined,
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
  signal?: AbortSignal,
  hasFileBody?: boolean
): Promise<ResponseSnapshot> {
  // The browser fetch path has only a file PATH, not a File object,
  // and cannot read arbitrary disk paths — multipart-with-files and
  // raw-binary uploads only work through the native (curl) path.
  if (hasFileBody) {
    throw new Error("File uploads require the native app (browser fetch can't read disk paths)");
  }
  const res = await fetch(url, { method, headers, body, redirect: "follow", signal });
  const respHeaders: { k: string; v: string }[] = [];
  res.headers.forEach((v, k) => respHeaders.push({ k, v }));
  let buf: ArrayBuffer;
  try {
    buf = await res.arrayBuffer();
  } catch {
    buf = new ArrayBuffer(0);
  }
  const bytes = new Uint8Array(buf);
  const ct = res.headers.get("content-type") || "";

  // Binary response channel — mirror the native handler so the rich
  // viewers work in browser-only (fetch) mode too.
  let bodyBase64: string | undefined;
  let bodyTooLarge: true | undefined;
  if (isBinaryContentType(ct)) {
    if (bytes.byteLength > MAX_BINARY_RAW) {
      bodyTooLarge = true;
    } else {
      bodyBase64 = bytesToBase64(bytes);
    }
  }

  return {
    status: res.status,
    statusText: res.statusText,
    headers: respHeaders,
    body: bytesToText(bytes),
    bodyBase64,
    bodyTooLarge,
    contentType: ct,
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
  /** One iteration row from the collection runner. Threaded into the
   *  pre/post script sandbox as `pm.iterationData`. Absent for an
   *  ordinary single send. */
  iterationData?: Record<string, string>;
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
      iterationData: opts.iterationData,
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
  const isBodyless = method === "GET" || method === "HEAD";
  const body = isBodyless ? undefined : buildBody(activeRequest, isGraphql, activeEnv);
  const multipart =
    !isBodyless && !isGraphql && activeRequest.body.mode === "multipart"
      ? buildMultipartWire(activeRequest.body.parts, activeEnv)
      : undefined;
  const binPath =
    !isBodyless && !isGraphql && activeRequest.body.mode === "binary"
      ? pickBinaryPath(activeRequest.body)
      : undefined;

  // AWS SigV4 — sign the final request just before sending. Signs the
  // string body; multipart/binary bodies sign as an empty payload (a
  // v1 limitation — those callers are rare for SigV4).
  const auth = activeRequest.auth;
  if (auth.type === "aws-sigv4" && auth.awsSigv4) {
    const s = auth.awsSigv4;
    if (s.accessKey && s.secretKey && s.region && s.service) {
      const signed = await signRequestV4({
        method,
        url,
        body: body ?? "",
        accessKey: envSubst(s.accessKey, activeEnv),
        secretKey: envSubst(s.secretKey, activeEnv),
        region: envSubst(s.region, activeEnv),
        service: envSubst(s.service, activeEnv),
        sessionToken: s.sessionToken ? envSubst(s.sessionToken, activeEnv) : undefined,
      });
      for (const h of signed) headers.set(h.name, h.value);
    }
  }

  // mTLS — resolve env vars in the cert/key paths.
  const mtls =
    auth.type === "mtls" && auth.mtls
      ? {
          certPath: auth.mtls.certPath ? envSubst(auth.mtls.certPath, activeEnv) : undefined,
          keyPath: auth.mtls.keyPath ? envSubst(auth.mtls.keyPath, activeEnv) : undefined,
          passphrase: auth.mtls.passphrase,
        }
      : undefined;

  const t0 = performance.now();
  const response = bridge.available
    ? await viaNative(url, method, headers, body, defaults, opts.signal, multipart, binPath, mtls)
    : await viaFetch(url, method, headers, body, t0, opts.signal, !!(multipart?.length || binPath));

  let postOutcome: ScriptOutcome | undefined;
  if (req.postScript && req.postScript.trim()) {
    const result = await runScript(req.postScript, {
      request: activeRequest,
      env: activeEnv,
      response,
      iterationData: opts.iterationData,
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
