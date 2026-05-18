/** Olgun Özoktaş geliştirdi · API Lab */
// Codegen contract — the CodegenInput every generator consumes, plus
// the Formatter / CodegenLang types the registry is keyed by.
import type { HttpHeader } from "../bridge";

export type CodegenInput = {
  method: string;
  url: string;
  headers: HttpHeader[];
  body?: string | null;
};

export type CodegenLang = "curl" | "fetch" | "axios" | "python" | "go" | "node";

export type Formatter = {
  id: CodegenLang;
  label: string;
  format: (input: CodegenInput) => string;
};

export function methodHasBody(method: string, body: string | null | undefined): boolean {
  if (!body) return false;
  const m = method.toUpperCase();
  return m !== "GET" && m !== "HEAD";
}
