/** Olgun Özoktaş geliştirdi · API Lab */
// Staleness detection for `openapi-url` integrations. A curated
// provider ships its endpoint set bundled with the app, so it can't
// drift; an `openapi-url` provider fetches a live upstream spec that
// providers revise continuously. This module fingerprints a fetched
// spec and, on a later conditional re-fetch, decides whether the
// local import has fallen behind.
//
// The pure functions (specFingerprint, compareFingerprint,
// verdictFrom) carry the logic and are unit-tested; checkSpecStaleness
// is a thin async wrapper that takes an injected probe so tests don't
// need a live native bridge. Curated providers always read "fresh" —
// there is no upstream to compare against.
import type { IntegrationDef } from "./registry";

export type StalenessVerdict = "fresh" | "stale" | "unreachable";

// djb2 — a small, stable, non-cryptographic string hash. Fingerprints
// a spec body when the server sends no ETag / Last-Modified validator;
// good enough to notice a spec was revised, which is all we need.
function hashBody(body: string): string {
  let h = 5381;
  for (let i = 0; i < body.length; i++) {
    h = ((h << 5) + h + body.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

// Derive a fingerprint for a fetched spec. Prefers the server's ETag
// (the strongest validator), then Last-Modified, then a body hash —
// providers vary in which they send, so the fallback chain keeps
// staleness detection working regardless. The prefix records which
// validator was used so `checkSpecStaleness` knows whether it can
// send a conditional `If-None-Match`.
export function specFingerprint(etag: string, lastModified: string, body: string): string {
  if (etag) return `etag:${etag}`;
  if (lastModified) return `lm:${lastModified}`;
  return `h:${hashBody(body)}`;
}

// fresh when the live fingerprint matches the one stored at import
// time; stale on any difference.
export function compareFingerprint(stored: string, live: string): "fresh" | "stale" {
  return stored === live ? "fresh" : "stale";
}

// The conditional-fetch result the async checker reasons over. `error`
// is set when the provider was unreachable; otherwise the HTTP status
// plus validators and body are present.
export type SpecProbe =
  | { error: string }
  | { status: number; etag: string; lastModified: string; body: string };

// Pure verdict: given a stored fingerprint and a probe result, decide
// fresh / stale / unreachable. A 304 (the server honored
// If-None-Match) is fresh by definition; a network error or a 4xx/5xx
// is `unreachable` — and the caller must NOT flip the badge on
// `unreachable`, so a flaky provider can't make the badge flap.
export function verdictFrom(storedFingerprint: string, probe: SpecProbe): StalenessVerdict {
  if ("error" in probe) return "unreachable";
  if (probe.status === 304) return "fresh";
  if (probe.status >= 400) return "unreachable";
  const live = specFingerprint(probe.etag, probe.lastModified, probe.body);
  return compareFingerprint(storedFingerprint, live);
}

// Async staleness check for one integration. Curated providers and
// integrations with no captured fingerprint short-circuit to `fresh`
// (nothing upstream to compare). `probe` is injected — production
// passes a bridge-backed conditional GET; tests pass a fake.
export async function checkSpecStaleness(
  def: IntegrationDef,
  storedFingerprint: string,
  probe: (specUrl: string, ifNoneMatch: string) => Promise<SpecProbe>
): Promise<StalenessVerdict> {
  if (def.fetch.kind !== "openapi-url") return "fresh";
  if (!storedFingerprint) return "fresh";
  // Only an ETag-derived fingerprint can drive a conditional request;
  // Last-Modified / hash fingerprints fall back to a full GET compare.
  const ifNoneMatch = storedFingerprint.startsWith("etag:") ? storedFingerprint.slice(5) : "";
  const result = await probe(def.fetch.specUrl, ifNoneMatch);
  return verdictFrom(storedFingerprint, result);
}
