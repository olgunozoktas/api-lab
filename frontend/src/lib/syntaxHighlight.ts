// Zero-dep syntax highlighter for TS/JSX/TSX. Used by the ErrorBoundary's
// Astro-style "blame frame" so the offending source excerpt reads as
// real code, not a flat dump. Hand-rolled instead of pulling in
// highlight.js / Prism so the recovery path stays bundle-light AND
// works even if other deps are wedged.
//
// Output shape: array of { type, value } tokens. Caller maps types to
// colors. Keyword + string + comment lexing covers ~95% of the visible
// surface in a 7-line excerpt; we don't try to be a full parser.

export type TokenType =
  | "keyword"
  | "string"
  | "template"
  | "comment"
  | "number"
  | "fn"
  | "jsxTag"
  | "jsxAttr"
  | "punct"
  | "ident"
  | "type";

export type Token = { type: TokenType; value: string };

const KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "throw",
  "new",
  "delete",
  "typeof",
  "instanceof",
  "in",
  "of",
  "this",
  "super",
  "class",
  "extends",
  "implements",
  "interface",
  "type",
  "enum",
  "import",
  "export",
  "from",
  "as",
  "async",
  "await",
  "yield",
  "true",
  "false",
  "null",
  "undefined",
  "void",
  "never",
  "any",
  "unknown",
  "boolean",
  "number",
  "string",
  "object",
  "readonly",
  "public",
  "private",
  "protected",
  "static",
  "abstract",
  "declare",
  "namespace",
  "module",
  "satisfies",
  "is",
  "keyof",
]);

// Walk the line character-by-character with a tiny state machine.
// Strings + comments must be lexed BEFORE keywords (they hide their
// contents from the keyword matcher). Inside strings we honor `\` escapes.
export function tokenizeLine(line: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    const c = line[i];

    // Line comment
    if (c === "/" && line[i + 1] === "/") {
      out.push({ type: "comment", value: line.slice(i) });
      return out;
    }
    // Block comment open (within a single line)
    if (c === "/" && line[i + 1] === "*") {
      const end = line.indexOf("*/", i + 2);
      const stop = end === -1 ? len : end + 2;
      out.push({ type: "comment", value: line.slice(i, stop) });
      i = stop;
      continue;
    }
    // String "..."
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < len) {
        if (line[j] === "\\") {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      out.push({ type: "string", value: line.slice(i, j) });
      i = j;
      continue;
    }
    // Template literal `...`
    if (c === "`") {
      let j = i + 1;
      while (j < len) {
        if (line[j] === "\\") {
          j += 2;
          continue;
        }
        if (line[j] === "`") {
          j += 1;
          break;
        }
        j += 1;
      }
      out.push({ type: "template", value: line.slice(i, j) });
      i = j;
      continue;
    }
    // Number — must come before identifier so we don't match `1.5` as ident
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(line[i + 1] ?? ""))) {
      const m = line.slice(i).match(/^(?:0x[0-9a-f]+|\d+\.?\d*(?:e[+-]?\d+)?)/i);
      if (m) {
        out.push({ type: "number", value: m[0] });
        i += m[0].length;
        continue;
      }
    }
    // Identifier / keyword / function call / type
    if (/[A-Za-z_$]/.test(c)) {
      const m = line.slice(i).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
      if (m) {
        const word = m[0];
        i += word.length;
        // Function call: identifier followed by `(`
        if (line[i] === "(") {
          out.push({ type: KEYWORDS.has(word) ? "keyword" : "fn", value: word });
        } else if (KEYWORDS.has(word)) {
          out.push({ type: "keyword", value: word });
        } else if (/^[A-Z]/.test(word)) {
          // Capitalized identifier — likely a Type or React component.
          out.push({ type: "type", value: word });
        } else {
          out.push({ type: "ident", value: word });
        }
        continue;
      }
    }
    // JSX-ish: `<Foo` or `</Foo` — colorize the tag name only
    if (c === "<" && /[A-Za-z\/]/.test(line[i + 1] ?? "")) {
      const m = line.slice(i).match(/^<\/?[A-Za-z][\w.-]*/);
      if (m) {
        out.push({ type: "jsxTag", value: m[0] });
        i += m[0].length;
        continue;
      }
    }
    // Whitespace + everything else as punctuation (single-char tokens
    // keep the React render small enough; we batch consecutive spaces).
    if (/\s/.test(c)) {
      let j = i;
      while (j < len && /\s/.test(line[j])) j += 1;
      out.push({ type: "punct", value: line.slice(i, j) });
      i = j;
      continue;
    }
    out.push({ type: "punct", value: c });
    i += 1;
  }
  return out;
}

// Color palette tuned for the dark error-overlay background (#0f172a).
// All inline so the overlay renders even when the app's stylesheet
// isn't loaded (defensive — error path shouldn't depend on CSS health).
export const TOKEN_COLOR: Record<TokenType, string> = {
  keyword: "#c084fc", // purple
  string: "#86efac", // green
  template: "#86efac", // green
  comment: "#94a3b8", // slate-400
  number: "#fb923c", // orange
  fn: "#22d3ee", // cyan
  jsxTag: "#fb7185", // rose
  jsxAttr: "#fbbf24", // amber
  type: "#fbbf24", // amber (also used for Type / Component idents)
  ident: "#f1f5f9", // default fg
  punct: "#cbd5e1", // muted fg
};
