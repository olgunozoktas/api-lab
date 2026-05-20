/** Olgun Özoktaş geliştirdi · API Lab */
// Cookie jar helpers — pure functions for the cookie subsystem.
//
// Scope (v1, per the parent backlog item):
//   - {domain, path, name, value} shape only. No `Secure`, no
//     `SameSite`, no expiry edge cases — those are documented v1
//     cuts and live as a follow-up backlog item.
//   - Domain match: case-insensitive suffix match, mirroring the
//     RFC 6265 §5.1.3 "canonicalized host string ends with the
//     cookie domain (with optional leading '.')" rule. Public-suffix
//     defenses are NOT applied; the user is talking to APIs they
//     own.
//   - Path match: prefix match per RFC 6265 §5.1.4. A cookie
//     `path=/api` matches requests to `/api`, `/api/`, `/api/v1`,
//     but NOT `/apiv1` (the trailing segment must be a real path
//     boundary).

export type Cookie = {
  // Stable id so the store + UI can refer to a single row without
  // implying any particular natural-key shape.
  id: string;
  // Hostname pattern (no scheme, no port). May start with a leading
  // dot for the legacy "subdomain match" convention, though modern
  // RFC 6265 treats `domain=example.com` and `.example.com` the same.
  domain: string;
  // URL path prefix. Empty string is treated as "/" — sent on every
  // path under the domain.
  path: string;
  name: string;
  value: string;
};

// Normalise host for comparison. RFC 6265 §5.1.2 says hosts are
// matched case-insensitively after canonicalisation; we lowercase
// here and trim a leading dot so `.example.com` and `example.com`
// compare equal.
function canonHost(host: string): string {
  let h = host.toLowerCase().trim();
  if (h.startsWith(".")) h = h.slice(1);
  return h;
}

// RFC 6265 §5.1.3 — "the cookie-string covers requests whose host
// is identical to OR a sub-domain of the canonicalised cookie
// domain". `example.com` matches `example.com`, `api.example.com`,
// and `a.b.example.com` — but NOT `notexample.com` (the substring
// match must be at a real domain boundary).
export function domainMatches(requestHost: string, cookieDomain: string): boolean {
  const req = canonHost(requestHost);
  const dom = canonHost(cookieDomain);
  if (!req || !dom) return false;
  if (req === dom) return true;
  if (!req.endsWith(dom)) return false;
  // The character immediately before the suffix must be a dot — that's
  // the "real boundary" check that distinguishes example.com from
  // notexample.com.
  return req.charAt(req.length - dom.length - 1) === ".";
}

// RFC 6265 §5.1.4 — cookie path matches when the request path is
// identical OR the cookie path is a prefix AND the boundary is a
// `/`. Empty / missing cookie path defaults to "/" so the cookie
// fires on every URL under the domain.
export function pathMatches(requestPath: string, cookiePath: string): boolean {
  const cp = cookiePath && cookiePath.length > 0 ? cookiePath : "/";
  const rp = requestPath && requestPath.length > 0 ? requestPath : "/";
  if (rp === cp) return true;
  if (!rp.startsWith(cp)) return false;
  // Boundary check: either the cookie path ends in "/" (so any tail
  // counts as a sub-path) OR the request path's next char is "/".
  if (cp.endsWith("/")) return true;
  return rp.charAt(cp.length) === "/";
}

// Pure URL → cookies matcher. Returns the cookies that apply to
// `url`. Invalid URLs return `[]` rather than throwing — the
// caller is the send-pipeline which has its own validation gates;
// throwing here would crash unrelated requests.
export function cookiesForUrl(jar: readonly Cookie[], url: string): Cookie[] {
  let host: string;
  let path: string;
  try {
    const u = new URL(url);
    host = u.hostname;
    path = u.pathname || "/";
  } catch {
    return [];
  }
  return jar.filter((c) => domainMatches(host, c.domain) && pathMatches(path, c.path));
}

// Build the `Cookie:` header value from a list of cookies — the
// shape curl wants behind `-b`. Empty list returns "". Order
// follows the input array (RFC 6265 has no required order; "most
// specific path first" is recommended but not enforced by servers,
// so we keep input order to make tests deterministic).
export function buildCookieHeader(cookies: readonly Cookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

// Parse a single Set-Cookie header value. Returns the cookie if the
// shape is recognised (at minimum `name=value`), with `domain` /
// `path` populated from attributes when present. Returns null on
// shapes we can't parse (cookies with no `=`, or only a flag).
//
// The host fallback is the request's hostname — RFC 6265 §5.3 says
// a cookie without an explicit `domain` attribute is bound to the
// origin server only. We honour that by using `requestHost` as the
// cookie's domain when `Domain=` is absent.
export function parseSetCookie(value: string, requestHost: string): Omit<Cookie, "id"> | null {
  if (!value) return null;
  const parts = value.split(";").map((p) => p.trim());
  const head = parts.shift();
  if (!head) return null;
  const eq = head.indexOf("=");
  if (eq <= 0) return null;
  const name = head.slice(0, eq).trim();
  const val = head.slice(eq + 1).trim();
  if (!name) return null;

  let domain = "";
  let path = "/";
  for (const attr of parts) {
    const aeq = attr.indexOf("=");
    if (aeq < 0) continue; // flags (Secure, HttpOnly) — ignored at v1
    const ak = attr.slice(0, aeq).trim().toLowerCase();
    const av = attr.slice(aeq + 1).trim();
    if (ak === "domain") domain = av;
    else if (ak === "path") path = av || "/";
  }
  // Fall back to the request host when no explicit Domain attribute —
  // that's the "host-only cookie" rule. Strip a leading dot for
  // canonical storage; matcher trims again, but keeping the canon
  // form here makes the UI list less confusing.
  if (!domain) domain = requestHost;
  if (domain.startsWith(".")) domain = domain.slice(1);
  return { domain, path, name, value: val };
}

// Parse the `Set-Cookie` headers from a response into Cookie shapes.
// One header line per cookie (the curl handler emits them
// independently). Invalid lines are skipped silently.
export function parseSetCookieHeaders(
  headers: ReadonlyArray<{ name: string; value: string }>,
  requestHost: string
): Omit<Cookie, "id">[] {
  const out: Omit<Cookie, "id">[] = [];
  for (const h of headers) {
    if (h.name.toLowerCase() !== "set-cookie") continue;
    const parsed = parseSetCookie(h.value, requestHost);
    if (parsed) out.push(parsed);
  }
  return out;
}
