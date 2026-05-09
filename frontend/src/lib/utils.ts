// Pure utility functions — no React, no zustand.

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function envSubst(s: string | null | undefined, vars: Record<string, string>): string {
  if (s == null) return "";
  return String(s).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export function statusText(code: number): string {
  const T: Record<number, string> = {
    200: "OK", 201: "Created", 202: "Accepted", 204: "No Content",
    301: "Moved", 302: "Found", 304: "Not Modified", 307: "Temp Redirect", 308: "Perm Redirect",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
    405: "Method Not Allowed", 409: "Conflict", 410: "Gone", 422: "Unprocessable", 429: "Too Many",
    500: "Server Error", 502: "Bad Gateway", 503: "Unavailable", 504: "Timeout",
  };
  return T[code] ?? "";
}

export function humanSize(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(2) + " MB";
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
    case "GET":     return "text-green-500";
    case "POST":    return "text-orange-500";
    case "PUT":     return "text-sky-500";
    case "PATCH":   return "text-purple-500";
    case "DELETE":  return "text-red-500";
    default:        return "text-[var(--color-fg-muted)]";
  }
}
