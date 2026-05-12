/** Olgun Özoktaş geliştirdi · API Lab */
import type { CodegenInput } from "./types";
import { methodHasBody } from "./types";

// Python double-quoted string literals accept the same escape sequences as JSON
// (\", \\, \n, \t, \uXXXX), so JSON.stringify produces a safe Python string.
const pyStr = (s: string): string => JSON.stringify(s);

export function toPython({ method, url, headers, body }: CodegenInput): string {
  const lines: string[] = [`import requests`, ``];
  const args: string[] = [pyStr(method), `url=${pyStr(url)}`];

  const hs = headers.filter((h) => h.name);
  if (hs.length) {
    lines.push(`headers = {`);
    for (const h of hs) {
      lines.push(`    ${pyStr(h.name)}: ${pyStr(h.value)},`);
    }
    lines.push(`}`);
    args.push(`headers=headers`);
  }
  if (methodHasBody(method, body)) {
    lines.push(`data = ${pyStr(body!)}`);
    args.push(`data=data`);
  }
  if (lines[lines.length - 1] !== ``) lines.push(``);
  lines.push(`response = requests.request(${args.join(", ")})`);
  lines.push(`print(response.text)`);
  return lines.join("\n");
}
