import type { HttpHeader } from "./bridge";

export type CurlInput = {
  method: string;
  url: string;
  headers: HttpHeader[];
  body?: string | null;
};

export function toCurl({ method, url, headers, body }: CurlInput): string {
  const esc = (s: string) => s.replace(/'/g, "'\\''");
  const lines = [`curl -X ${method} '${esc(url)}'`];
  for (const h of headers) {
    if (!h.name) continue;
    lines.push(`  -H '${esc(h.name)}: ${esc(h.value)}'`);
  }
  if (body && method !== "GET" && method !== "HEAD") {
    lines.push(`  --data-raw '${esc(body)}'`);
  }
  return lines.join(" \\\n");
}
