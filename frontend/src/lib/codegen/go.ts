/** Olgun Özoktaş geliştirdi · API Lab */
import type { CodegenInput } from "./types";
import { methodHasBody } from "./types";

// Go double-quoted string literals accept the same escape sequences as JSON
// (\", \\, \n, \t, \uXXXX), so JSON.stringify produces a safe Go string.
const goStr = (s: string): string => JSON.stringify(s);

export function toGo({ method, url, headers, body }: CodegenInput): string {
  const hasBody = methodHasBody(method, body);
  const lines: string[] = [];
  lines.push(`package main`);
  lines.push(``);
  lines.push(`import (`);
  if (hasBody) lines.push(`\t"bytes"`);
  lines.push(`\t"fmt"`);
  lines.push(`\t"io"`);
  lines.push(`\t"net/http"`);
  lines.push(`)`);
  lines.push(``);
  lines.push(`func main() {`);
  if (hasBody) {
    lines.push(`\tbody := bytes.NewReader([]byte(${goStr(body!)}))`);
    lines.push(`\treq, err := http.NewRequest(${goStr(method)}, ${goStr(url)}, body)`);
  } else {
    lines.push(`\treq, err := http.NewRequest(${goStr(method)}, ${goStr(url)}, nil)`);
  }
  lines.push(`\tif err != nil {`);
  lines.push(`\t\tpanic(err)`);
  lines.push(`\t}`);
  const hs = headers.filter((h) => h.name);
  for (const h of hs) {
    lines.push(`\treq.Header.Set(${goStr(h.name)}, ${goStr(h.value)})`);
  }
  lines.push(``);
  lines.push(`\tres, err := http.DefaultClient.Do(req)`);
  lines.push(`\tif err != nil {`);
  lines.push(`\t\tpanic(err)`);
  lines.push(`\t}`);
  lines.push(`\tdefer res.Body.Close()`);
  lines.push(``);
  lines.push(`\tdata, _ := io.ReadAll(res.Body)`);
  lines.push(`\tfmt.Println(string(data))`);
  lines.push(`}`);
  return lines.join("\n");
}
