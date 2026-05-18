/** Olgun Özoktaş geliştirdi · API Lab */
import { bridge, type HttpResponse } from "../bridge";
import { parseOpenApi, type OpenApiImportResult } from "../importers/openapi";
import type { IntegrationDef } from "./registry";

// The native bridge's http.request result buffer caps near 1 MB. A
// spec body at or over this can't survive the round-trip, so it is
// reported as oversize rather than silently truncated.
export const SPEC_SIZE_LIMIT = 1_000_000;

export type IntegrationFetchResult =
  | { ok: true; result: OpenApiImportResult }
  | {
      ok: false;
      reason: "bridge-unavailable" | "fetch-failed" | "too-large" | "parse-failed";
      detail: string;
    };

// Pure — turn an already-fetched spec body into importable items.
// Separated from the bridge call so it is unit-testable without a
// live native bridge.
export function parseIntegrationSpec(body: string, _def: IntegrationDef): IntegrationFetchResult {
  if (body.length >= SPEC_SIZE_LIMIT) {
    return {
      ok: false,
      reason: "too-large",
      detail: `${(body.length / 1_000_000).toFixed(1)} MB`,
    };
  }
  try {
    const result = parseOpenApi(body);
    if (result.items.length === 0) {
      return { ok: false, reason: "parse-failed", detail: "no operations found in spec" };
    }
    return { ok: true, result };
  } catch (e) {
    return {
      ok: false,
      reason: "parse-failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

// Fetch + parse an integration's OpenAPI spec through the native
// bridge (CORS-free). Returns a discriminated result the gallery
// renders directly — every failure mode is explicit, never a throw.
export async function fetchIntegrationSpec(def: IntegrationDef): Promise<IntegrationFetchResult> {
  if (!bridge.available) {
    return { ok: false, reason: "bridge-unavailable", detail: "native bridge required" };
  }
  let res: HttpResponse;
  try {
    res = await bridge.invoke<HttpResponse>("http.request", {
      method: "GET",
      url: def.fetch.specUrl,
      headers: [],
      body: null,
    });
  } catch (e) {
    return {
      ok: false,
      reason: "fetch-failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
  if (res.error) return { ok: false, reason: "fetch-failed", detail: res.error };
  if (res.body_too_large) {
    return { ok: false, reason: "too-large", detail: "exceeds the bridge result buffer" };
  }
  if (res.status >= 400) {
    return { ok: false, reason: "fetch-failed", detail: `HTTP ${res.status}` };
  }
  return parseIntegrationSpec(res.body, def);
}
