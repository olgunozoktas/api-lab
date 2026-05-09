import { bridge } from "./bridge";
import type { HttpHeader, HttpResponse } from "./bridge";
import type { CurrentRequest, ResponseSnapshot } from "./types";
import { envSubst } from "./utils";

export function buildHeadersList(req: CurrentRequest, vars: Record<string, string>): Headers {
  const out = new Headers();
  for (const h of req.headers) {
    if (!h.enabled || !h.k) continue;
    try { out.append(envSubst(h.k, vars), envSubst(h.v, vars)); } catch { /* invalid */ }
  }
  const a = req.auth;
  if (a.type === "bearer" && a.token) {
    out.set("Authorization", "Bearer " + envSubst(a.token, vars));
  } else if (a.type === "basic" && (a.user || a.pass)) {
    out.set("Authorization",
      "Basic " + btoa(envSubst(a.user || "", vars) + ":" + envSubst(a.pass || "", vars)));
  } else if (a.type === "apikey" && a.header && a.value) {
    out.set(envSubst(a.header, vars), envSubst(a.value, vars));
  }
  return out;
}

export function buildUrl(req: CurrentRequest, vars: Record<string, string>): string {
  let url = envSubst(req.url, vars);
  const params = req.params.filter((r) => r.enabled && r.k);
  if (params.length === 0) return url;
  const qs = params
    .map((r) => encodeURIComponent(envSubst(r.k, vars)) + "=" + encodeURIComponent(envSubst(r.v, vars)))
    .join("&");
  return url + (url.includes("?") ? "&" : "?") + qs;
}

export function buildBody(req: CurrentRequest, isGraphql: boolean, vars: Record<string, string>): string | undefined {
  if (isGraphql) {
    let parsedVars: unknown = {};
    try { parsedVars = req.gql.vars ? JSON.parse(envSubst(req.gql.vars, vars)) : {}; } catch { /* keep empty */ }
    return JSON.stringify({ query: envSubst(req.gql.query, vars), variables: parsedVars });
  }
  if (req.body.mode === "none") return undefined;
  return envSubst(req.body.text, vars);
}

export function effectiveContentType(req: CurrentRequest, isGraphql: boolean, headers: Headers): void {
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

async function viaNative(
  url: string, method: string, headers: Headers, body: string | undefined,
): Promise<ResponseSnapshot> {
  const headerArr: HttpHeader[] = [];
  headers.forEach((v, k) => headerArr.push({ name: k, value: v }));
  const r = await bridge.invoke<HttpResponse>("http.request", {
    method, url, headers: headerArr, body: body ?? null,
    timeout_ms: 60_000, follow_redirects: 10, insecure: false,
  });
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
    sizeBytes: r.size_bytes ?? (r.body?.length ?? 0),
    elapsedMs: r.timing_ms ?? r.timing?.total_ms ?? 0,
    url: r.url || url,
    transport: "native",
    timing: r.timing,
  };
}

async function viaFetch(
  url: string, method: string, headers: Headers, body: string | undefined, t0: number,
): Promise<ResponseSnapshot> {
  const res = await fetch(url, { method, headers, body, redirect: "follow" });
  const respHeaders: { k: string; v: string }[] = [];
  res.headers.forEach((v, k) => respHeaders.push({ k, v }));
  let buf: ArrayBuffer;
  try { buf = await res.arrayBuffer(); } catch { buf = new ArrayBuffer(0); }
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

export async function send(
  req: CurrentRequest, isGraphql: boolean, vars: Record<string, string>,
): Promise<ResponseSnapshot> {
  const url = buildUrl(req, vars);
  if (!url) throw new Error("URL boş");
  const method = isGraphql ? "POST" : req.method;
  const headers = buildHeadersList(req, vars);
  effectiveContentType(req, isGraphql, headers);
  const body = method === "GET" || method === "HEAD" ? undefined : buildBody(req, isGraphql, vars);

  const t0 = performance.now();
  return bridge.available
    ? viaNative(url, method, headers, body)
    : viaFetch(url, method, headers, body, t0);
}
