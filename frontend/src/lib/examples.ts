// Helpers for the saved-response examples feature.
// The Zig mock-server sidecar that consumes these is a backlog
// follow-up — these helpers ship now so collections + Postman imports
// can already collect examples.

import type { Example, ResponseSnapshot, RequestSnapshot } from "./types";

// Extract a path from a URL, with env-var template strings tolerated.
// `{{base_url}}/users/42` → `/users/42`
// `https://api.example.com/v1/list?x=1` → `/v1/list`
// Bare paths come through as-is. Returns "/" for empty input.
export function pathFromUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return "/";

  // Mustache-style {{var}} prefix — strip it and any leading
  // dot/slash. We use the part after the first `/` that follows a
  // closing `}}`.
  const mustache = raw.match(/^\{\{[^}]+\}\}(.*)$/);
  if (mustache) {
    const rest = (mustache[1] || "").trim();
    if (!rest) return "/";
    return rest.startsWith("/") ? stripQuery(rest) : "/" + stripQuery(rest);
  }

  // Has a scheme — try URL parsing.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
    try {
      const u = new URL(raw);
      return u.pathname || "/";
    } catch {
      // fall through
    }
  }

  // Bare path — strip query.
  return raw.startsWith("/") ? stripQuery(raw) : "/" + stripQuery(raw);
}

function stripQuery(s: string): string {
  const i = s.indexOf("?");
  return (i >= 0 ? s.slice(0, i) : s) || "/";
}

// Build a fresh Example from a successful response + the request that
// produced it. Pure — caller appends to request.examples.
export function exampleFromResponse(
  name: string,
  request: RequestSnapshot,
  response: ResponseSnapshot
): Example {
  return {
    id: `ex_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: name.trim() || `${response.status} ${response.url}`,
    status: response.status,
    headers: [...response.headers],
    body: response.body,
    contentType: response.contentType,
    path: pathFromUrl(request.url),
    method: (request.method || "GET").toUpperCase(),
    savedAt: Date.now(),
  };
}

// Reconstruct a ResponseSnapshot from an example so it can render in
// the response viewer when the user clicks an example. The transport
// + timing + size_bytes get sensible defaults (the mock server will
// emit real numbers when it ships).
export function exampleToResponse(example: Example, url: string): ResponseSnapshot {
  return {
    status: example.status,
    statusText: "",
    headers: example.headers,
    body: example.body,
    contentType: example.contentType,
    sizeBytes: example.body.length,
    elapsedMs: 0,
    url,
    transport: "fetch",
  };
}

// Default name suggestion when the user opens the Save-as-Example
// dialog. "GET /users/42 → 200" — read at a glance, edit before save.
export function suggestExampleName(request: RequestSnapshot, response: ResponseSnapshot): string {
  return `${(request.method || "GET").toUpperCase()} ${pathFromUrl(request.url)} → ${response.status}`;
}
