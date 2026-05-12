/** Olgun Özoktaş geliştirdi · API Lab */
import type { CodegenInput, CodegenLang, Formatter } from "./types";
import { toCurl } from "./curl";
import { toFetch } from "./fetch";
import { toAxios } from "./axios";
import { toPython } from "./python";
import { toGo } from "./go";
import { toNode } from "./node";

export type { CodegenInput, CodegenLang, Formatter } from "./types";

export const formatters: ReadonlyArray<Formatter> = [
  { id: "curl", label: "cURL", format: toCurl },
  { id: "fetch", label: "JavaScript fetch", format: toFetch },
  { id: "axios", label: "JavaScript axios", format: toAxios },
  { id: "python", label: "Python requests", format: toPython },
  { id: "go", label: "Go net/http", format: toGo },
  { id: "node", label: "Node.js https", format: toNode },
];

export function generate(lang: CodegenLang, input: CodegenInput): string {
  const f = formatters.find((x) => x.id === lang);
  if (!f) throw new Error(`Unknown codegen language: ${lang}`);
  return f.format(input);
}

export { toCurl, toFetch, toAxios, toPython, toGo, toNode };
