/** Olgun Özoktaş geliştirdi · API Lab */
import type { CodegenInput } from "./types";
import { methodHasBody } from "./types";

export function toFetch({ method, url, headers, body }: CodegenInput): string {
  const lines: string[] = [];
  lines.push(`fetch(${JSON.stringify(url)}, {`);
  lines.push(`  method: ${JSON.stringify(method)},`);
  const hs = headers.filter((h) => h.name);
  if (hs.length) {
    lines.push(`  headers: {`);
    for (const h of hs) {
      lines.push(`    ${JSON.stringify(h.name)}: ${JSON.stringify(h.value)},`);
    }
    lines.push(`  },`);
  }
  if (methodHasBody(method, body)) {
    lines.push(`  body: ${JSON.stringify(body)},`);
  }
  lines.push(`})`);
  lines.push(`  .then((res) => res.text())`);
  lines.push(`  .then((data) => console.log(data));`);
  return lines.join("\n");
}
