/** Olgun Özoktaş geliştirdi · API Lab */
// Secret-redactor for the codegen pipeline. Lives between the
// CopyAsMenu container's `buildInput` step and `formatter.format()`,
// so every language's emission picks up the redaction for free —
// `Authorization: Bearer abc123` becomes
// `Authorization: <REDACTED>` in curl, fetch, axios, python, go,
// node alike.
//
// History: P3 #59 (this slice). The "Copy as code" emission embeds
// live env-substituted secrets — bearer tokens, API keys, cookies.
// Paste-and-run is convenient and the default, but a user pasting
// the generated snippet into a chat or bug report leaked their
// credentials. This module is the opt-in safety net.
import type { CodegenInput } from "./types";
import type { HttpHeader } from "../bridge";

export const REDACTED_PLACEHOLDER = "<REDACTED>";

// Headers carrying credentials. Names are matched case-insensitively
// because HTTP header names are case-insensitive per RFC 7230 §3.2 —
// `Authorization`, `authorization`, and `AUTHORIZATION` all redact.
// Names are interpreted as exact matches (no substring matching) so a
// custom header like `X-Auth-Source` is NOT redacted by accident; the
// allowlist intentionally stays conservative.
const SENSITIVE_HEADER_NAMES: ReadonlySet<string> = new Set(
  ["authorization", "proxy-authorization", "cookie", "set-cookie", "x-api-key", "x-auth-token"].map(
    (s) => s.toLowerCase()
  )
);

// JSON keys whose string values are replaced when redaction is on.
// Same conservative-by-default policy as the header allowlist —
// custom key names like `bearerToken` / `accessToken` aren't matched
// until the user reports they need it (iterate based on real data).
const SENSITIVE_BODY_KEYS: ReadonlySet<string> = new Set([
  "token",
  "api_key",
  "secret",
  "password",
]);

export function redactHeaders(headers: ReadonlyArray<HttpHeader>): HttpHeader[] {
  return headers.map((h) =>
    SENSITIVE_HEADER_NAMES.has(h.name.toLowerCase())
      ? { name: h.name, value: REDACTED_PLACEHOLDER }
      : h
  );
}

// Best-effort body redaction. Bodies arrive as opaque strings — they
// may be JSON, form-encoded, multipart, raw binary, or anything else.
// We try to parse as JSON; if it parses, walk the tree replacing
// sensitive-key values, then re-serialise. Non-JSON bodies fall
// through unchanged (a regex pass over arbitrary strings is too
// likely to corrupt the snippet — better to leave it visible and
// trust the user to scrub by hand for non-JSON payloads).
export function redactBody(body: string | null | undefined): string | null | undefined {
  if (body == null || body === "") return body;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return body;
  }
  const redacted = redactJsonValue(parsed);
  // Preserve the original prettiness — if the input had newlines we
  // pretty-print, otherwise compact. Heuristic but matches what a
  // user would expect when comparing the two outputs side by side.
  const pretty = body.includes("\n");
  return JSON.stringify(redacted, null, pretty ? 2 : 0);
}

function redactJsonValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(redactJsonValue);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (SENSITIVE_BODY_KEYS.has(k.toLowerCase()) && typeof val === "string") {
        out[k] = REDACTED_PLACEHOLDER;
      } else {
        out[k] = redactJsonValue(val);
      }
    }
    return out;
  }
  return v;
}

// Convenience — apply both passes in one call. The CopyAsMenu
// container reads the `codegenRedact` UI flag and conditionally
// pipes the input through this before handing it to the formatter.
export function redactInput(input: CodegenInput): CodegenInput {
  return {
    ...input,
    headers: redactHeaders(input.headers),
    body: redactBody(input.body),
  };
}
