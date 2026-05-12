/** Olgun Özoktaş geliştirdi · API Lab */
import type { CodegenInput } from "./types";
import { methodHasBody } from "./types";

export function toCurl({ method, url, headers, body }: CodegenInput): string {
  const esc = (s: string) => s.replace(/'/g, "'\\''");
  const lines = [`curl -X ${method} '${esc(url)}'`];
  for (const h of headers) {
    if (!h.name) continue;
    lines.push(`  -H '${esc(h.name)}: ${esc(h.value)}'`);
  }
  if (methodHasBody(method, body)) {
    lines.push(`  --data-raw '${esc(body!)}'`);
  }
  return lines.join(" \\\n");
}
