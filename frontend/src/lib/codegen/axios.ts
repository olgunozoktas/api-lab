import type { CodegenInput } from "./types";
import { methodHasBody } from "./types";

export function toAxios({ method, url, headers, body }: CodegenInput): string {
  const lines: string[] = [];
  lines.push(`import axios from "axios";`);
  lines.push(``);
  lines.push(`axios({`);
  lines.push(`  method: ${JSON.stringify(method.toLowerCase())},`);
  lines.push(`  url: ${JSON.stringify(url)},`);
  const hs = headers.filter((h) => h.name);
  if (hs.length) {
    lines.push(`  headers: {`);
    for (const h of hs) {
      lines.push(`    ${JSON.stringify(h.name)}: ${JSON.stringify(h.value)},`);
    }
    lines.push(`  },`);
  }
  if (methodHasBody(method, body)) {
    lines.push(`  data: ${JSON.stringify(body)},`);
  }
  lines.push(`})`);
  lines.push(`  .then((res) => console.log(res.data));`);
  return lines.join("\n");
}
