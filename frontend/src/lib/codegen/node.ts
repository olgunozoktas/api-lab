/** Olgun Özoktaş geliştirdi · API Lab */
// Code generator — turns a CodegenInput into a Node http/https snippet.
import type { CodegenInput } from "./types";
import { methodHasBody } from "./types";

type UrlParts = { hostname: string; port: string | null; path: string; isHttps: boolean };

function parseUrlLite(url: string): UrlParts {
  try {
    const u = new URL(url);
    return {
      hostname: u.hostname,
      port: u.port || null,
      path: (u.pathname || "/") + (u.search || ""),
      isHttps: u.protocol === "https:",
    };
  } catch {
    return { hostname: url, port: null, path: "/", isHttps: true };
  }
}

export function toNode({ method, url, headers, body }: CodegenInput): string {
  const u = parseUrlLite(url);
  const mod = u.isHttps ? "https" : "http";
  const hasBody = methodHasBody(method, body);
  const lines: string[] = [];
  lines.push(`const ${mod} = require(${JSON.stringify(mod)});`);
  lines.push(``);
  lines.push(`const options = {`);
  lines.push(`  hostname: ${JSON.stringify(u.hostname)},`);
  if (u.port) lines.push(`  port: ${JSON.stringify(u.port)},`);
  lines.push(`  path: ${JSON.stringify(u.path)},`);
  lines.push(`  method: ${JSON.stringify(method)},`);
  const hs = headers.filter((h) => h.name);
  if (hs.length) {
    lines.push(`  headers: {`);
    for (const h of hs) {
      lines.push(`    ${JSON.stringify(h.name)}: ${JSON.stringify(h.value)},`);
    }
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);
  lines.push(`const req = ${mod}.request(options, (res) => {`);
  lines.push(`  let data = "";`);
  lines.push(`  res.on("data", (chunk) => (data += chunk));`);
  lines.push(`  res.on("end", () => console.log(data));`);
  lines.push(`});`);
  lines.push(``);
  lines.push(`req.on("error", (err) => console.error(err));`);
  if (hasBody) {
    lines.push(`req.write(${JSON.stringify(body)});`);
  }
  lines.push(`req.end();`);
  return lines.join("\n");
}
