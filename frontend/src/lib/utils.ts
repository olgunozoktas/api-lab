// Pure utility functions — no React, no zustand.

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function envSubst(s: string | null | undefined, vars: Record<string, string>): string {
  if (s == null) return "";
  return String(s).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

// Bucket a status code into its RFC 9110 class. `other` covers
// edge cases (0 = no response, negative, > 599) that shouldn't ship
// a class description.
export type StatusClassKey = "1xx" | "2xx" | "3xx" | "4xx" | "5xx" | "other";
export function statusClass(code: number): StatusClassKey {
  if (code >= 100 && code < 200) return "1xx";
  if (code >= 200 && code < 300) return "2xx";
  if (code >= 300 && code < 400) return "3xx";
  if (code >= 400 && code < 500) return "4xx";
  if (code >= 500 && code < 600) return "5xx";
  return "other";
}

export function statusText(code: number): string {
  const T: Record<number, string> = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    301: "Moved",
    302: "Found",
    304: "Not Modified",
    307: "Temp Redirect",
    308: "Perm Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    410: "Gone",
    422: "Unprocessable",
    429: "Too Many",
    500: "Server Error",
    502: "Bad Gateway",
    503: "Unavailable",
    504: "Timeout",
  };
  return T[code] ?? "";
}

export function humanSize(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(2) + " MB";
}

// Tab strip / sidebar default names — anything that matches one of
// these is treated as "user hasn't named it yet", so `displayTabName`
// can derive a more useful label from the URL.
const DEFAULT_TAB_NAMES = new Set(["Yeni istek", "New request", "Untitled"]);

// Compute the visible tab strip label. When the tab is still using
// the default placeholder name AND a URL is set, fall back to a
// `${METHOD} ${shortUrl}` derived form so a strip full of new tabs
// shows what each one is about. Once the user renames the tab (or
// loads a saved collection request) the stored name wins.
export function displayTabName(opts: {
  name: string;
  method: string;
  url: string;
  maxUrl?: number;
}): string {
  const stored = (opts.name ?? "").trim();
  if (stored && !DEFAULT_TAB_NAMES.has(stored)) return stored;
  const url = (opts.url ?? "").trim();
  if (!url) return stored || "Untitled";
  const max = opts.maxUrl ?? 32;
  // Strip scheme + trailing slash so the visible portion is the
  // host + path — the part the user identifies the request by.
  let shortUrl = url.replace(/^[a-z]+:\/\//i, "").replace(/\/$/, "");
  if (shortUrl.length > max) shortUrl = shortUrl.slice(0, max - 1) + "…";
  return `${opts.method.toUpperCase()} ${shortUrl}`;
}

export function timeAgo(ts: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - ts) / 1000));
  if (seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.round(months / 12)}y`;
}

export function isProbablyJson(s: string): boolean {
  const t = s.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

export function statusPillClass(code: number): string {
  if (code >= 500) return "bg-red-500/15 text-[var(--color-danger)]";
  if (code >= 400) return "bg-orange-500/15 text-[var(--color-warning)]";
  if (code >= 200) return "bg-green-500/15 text-[var(--color-success)]";
  return "bg-[var(--color-bg-elev-2)] text-[var(--color-fg-muted)]";
}

export function methodClass(method: string): string {
  switch (method) {
    case "GET":
      return "text-green-500";
    case "POST":
      return "text-orange-500";
    case "PUT":
      return "text-sky-500";
    case "PATCH":
      return "text-purple-500";
    case "DELETE":
      return "text-red-500";
    default:
      return "text-[var(--color-fg-muted)]";
  }
}
