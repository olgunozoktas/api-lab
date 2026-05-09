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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Token-based JSON syntax highlight. Avoids the regex-chain pitfall where
// the second regex matches "json-string" inside an already-injected span.
export function highlightJson(json: string): string {
  const out: string[] = [];
  let i = 0;
  const n = json.length;
  while (i < n) {
    const c = json[i];
    if (c === '"') {
      const start = i++;
      while (i < n && json[i] !== '"') {
        if (json[i] === "\\" && i + 1 < n) i++;
        i++;
      }
      i++;
      const str = json.slice(start, i);
      let j = i;
      while (j < n && /\s/.test(json[j])) j++;
      const isKey = json[j] === ":";
      const cls = isKey ? "json-key" : "json-string";
      out.push(`<span class="${cls}">${escapeHtml(str)}</span>`);
    } else if (c === "-" || (c >= "0" && c <= "9")) {
      const start = i++;
      while (i < n && /[\d.eE+\-]/.test(json[i])) i++;
      out.push(`<span class="json-number">${json.slice(start, i)}</span>`);
    } else if (json.startsWith("true", i))  { out.push('<span class="json-bool">true</span>');  i += 4; }
    else   if (json.startsWith("false", i)) { out.push('<span class="json-bool">false</span>'); i += 5; }
    else   if (json.startsWith("null", i))  { out.push('<span class="json-null">null</span>');  i += 4; }
    else { out.push(escapeHtml(c)); i++; }
  }
  return out.join("");
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
