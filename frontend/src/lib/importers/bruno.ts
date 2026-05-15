/** Olgun Özoktaş geliştirdi · API Lab */
// Bruno (.bru) importer.
//
// Bruno stores each request as a single plain-text `.bru` file in its
// own block-structured language (NOT JSON — Bruno's git-native answer
// to Postman's JSON collections). A Bruno *collection* is a directory
// of `.bru` files; api-lab's import UI is single-file, so this v1
// imports ONE request per `.bru`. Multi-file (directory) import is a
// deliberate follow-up.
//
// The `.bru` grammar, as Bruno itself serializes it:
//   - Every block is `<header> {` on its own line, closed by a line
//     that is exactly `}` at column 0.
//   - The HTTP-method block (`get {`, `post {`, …) plus `headers`,
//     `query`, and `auth:*` blocks are dictionaries — `key: value`
//     per line, a leading `~` marks the entry disabled.
//   - `body:json` / `body:text` / `body:xml` / … are *text* blocks:
//     their content is captured verbatim, then dedented.
//
// We rely on the column-0-`}` convention: Bruno always indents block
// content, so a JSON body's own braces never sit at column 0 and
// can't be mistaken for the block terminator. Hand-written `.bru`
// files that violate it may parse oddly — surfaced as a warning.
//
// What we map:  meta.name, method + url, headers, query params,
//               bearer / basic / apikey auth, json / text / xml body.
// What we warn-and-skip:  graphql / multipart / form-urlencoded body,
//               params:path, oauth2 / awsv4 / digest auth, vars/scripts.

import type { Auth, CollectionItem, KvRow, RequestSnapshot } from "../types";

export type BrunoImportResult = {
  items: CollectionItem[];
  envVars: Record<string, string>;
  warnings: string[];
  collectionName: string;
  requestCount: number;
  folderCount: number;
};

const HTTP_METHODS = new Set(["get", "post", "put", "delete", "patch", "head", "options"]);

// ---------- id seq ----------
let _seq = 0;
function newId(): string {
  _seq = (_seq + 1) % 1_000_000;
  return `bru_${Date.now().toString(36)}_${_seq}`;
}
export function __resetIdSeqForTesting(): void {
  _seq = 0;
}

// ---------- block tokenizer ----------
type BruBlock = { name: string; body: string[] };

const BLOCK_OPEN_RE = /^([A-Za-z][\w:\-]*)\s*\{\s*$/;
const BLOCK_CLOSE_RE = /^\}\s*$/;

// Walk the file line-by-line, slicing out top-level `<header> { … }`
// blocks. Block bodies are NOT re-tokenized — inner JSON braces and
// inner text are collected raw — so a JSON body can never be mistaken
// for a nested block.
function tokenizeBlocks(text: string, warnings: string[]): BruBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: BruBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = BLOCK_OPEN_RE.exec(lines[i]);
    if (!m) {
      i++;
      continue;
    }
    const name = m[1];
    const body: string[] = [];
    i++;
    let closed = false;
    while (i < lines.length) {
      if (BLOCK_CLOSE_RE.test(lines[i])) {
        closed = true;
        i++;
        break;
      }
      body.push(lines[i]);
      i++;
    }
    if (!closed) {
      warnings.push(`block "${name}" was not closed — content may be incomplete.`);
    }
    blocks.push({ name, body });
  }
  return blocks;
}

// ---------- dictionary + text block helpers ----------
type DictEntry = { key: string; value: string; enabled: boolean };

// Parse a dictionary block: one `key: value` per line, splitting on
// the FIRST colon (values like URLs and `Bearer x` keep their own
// colons). A leading `~` on the key marks the entry disabled.
function parseDict(body: string[]): DictEntry[] {
  const out: DictEntry[] = [];
  for (const raw of body) {
    const line = raw.trim();
    if (line === "") continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    let key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    let enabled = true;
    if (key.startsWith("~")) {
      enabled = false;
      key = key.slice(1).trim();
    }
    if (key === "") continue;
    out.push({ key, value, enabled });
  }
  return out;
}

function dictGet(entries: DictEntry[], key: string): string | undefined {
  return entries.find((e) => e.key === key)?.value;
}

// Strip the common leading indentation Bruno adds to every text-block
// line, plus any leading/trailing blank lines.
function dedent(body: string[]): string {
  let start = 0;
  let end = body.length;
  while (start < end && body[start].trim() === "") start++;
  while (end > start && body[end - 1].trim() === "") end--;
  const slice = body.slice(start, end);
  if (slice.length === 0) return "";
  let min = Infinity;
  for (const l of slice) {
    if (l.trim() === "") continue;
    const indent = l.length - l.replace(/^\s+/, "").length;
    if (indent < min) min = indent;
  }
  if (!Number.isFinite(min) || min === 0) return slice.join("\n");
  return slice.map((l) => l.slice(min)).join("\n");
}

function emptyRow(): KvRow {
  return { enabled: true, k: "", v: "" };
}

function dictToKv(entries: DictEntry[]): KvRow[] {
  const rows: KvRow[] = entries.map((e) => ({ enabled: e.enabled, k: e.key, v: e.value }));
  if (rows.length === 0) rows.push(emptyRow());
  return rows;
}

// ---------- auth + body mapping ----------
function mapAuth(authType: string | undefined, blocks: BruBlock[], warnings: string[]): Auth {
  const type = (authType ?? "none").toLowerCase();
  if (type === "none" || type === "") return { type: "none" };
  const block = blocks.find((b) => b.name.toLowerCase() === `auth:${type}`);
  const d = block ? parseDict(block.body) : [];
  switch (type) {
    case "bearer":
      return { type: "bearer", token: dictGet(d, "token") ?? "" };
    case "basic":
      return {
        type: "basic",
        user: dictGet(d, "username") ?? "",
        pass: dictGet(d, "password") ?? "",
      };
    case "apikey": {
      const placement = (dictGet(d, "placement") ?? "header").toLowerCase();
      if (placement !== "header") {
        warnings.push(
          `apikey placement "${placement}" not supported (only header) — leaving as header.`
        );
      }
      return {
        type: "apikey",
        header: dictGet(d, "key") ?? "X-API-Key",
        value: dictGet(d, "value") ?? "",
      };
    }
    default:
      warnings.push(`auth type "${type}" not yet supported — leaving as none.`);
      return { type: "none" };
  }
}

function mapBody(
  bodyType: string | undefined,
  blocks: BruBlock[],
  warnings: string[]
): { mode: "none" | "json" | "raw"; text: string } {
  const type = (bodyType ?? "none").toLowerCase();
  if (type === "none" || type === "") return { mode: "none", text: "" };
  const textBlock = (n: string) => blocks.find((b) => b.name.toLowerCase() === n);
  switch (type) {
    case "json": {
      const b = textBlock("body:json");
      return { mode: "json", text: b ? dedent(b.body) : "" };
    }
    case "text": {
      const b = textBlock("body:text");
      return { mode: "raw", text: b ? dedent(b.body) : "" };
    }
    case "xml": {
      const b = textBlock("body:xml");
      return { mode: "raw", text: b ? dedent(b.body) : "" };
    }
    case "sparql": {
      const b = textBlock("body:sparql");
      return { mode: "raw", text: b ? dedent(b.body) : "" };
    }
    case "graphql":
      warnings.push("graphql body not yet mapped (use the GraphQL tab on the request).");
      return { mode: "none", text: "" };
    case "form-urlencoded":
      warnings.push("form-urlencoded body skipped — form-body UI not yet wired.");
      return { mode: "none", text: "" };
    case "multipart-form":
      warnings.push("multipart-form body skipped (no FormData primitive yet).");
      return { mode: "none", text: "" };
    default:
      warnings.push(`body type "${type}" not recognized — left empty.`);
      return { mode: "none", text: "" };
  }
}

// ---------- main entry ----------

/** Cheap structural sniff — does this look like a Bruno `.bru` file?
    Operates on the raw text since `.bru` is not JSON. */
export function isBrunoFile(text: string): boolean {
  if (typeof text !== "string" || text.trim() === "") return false;
  // Postman / Insomnia / HAR are all JSON documents — reject anything
  // that opens with `{` or `[` before paying for the tokenizer.
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  const blocks = tokenizeBlocks(text, []);
  if (blocks.length === 0) return false;
  // Anything Bruno itself writes has a `meta` block or an HTTP-method
  // block (usually both).
  return blocks.some(
    (b) => b.name.toLowerCase() === "meta" || HTTP_METHODS.has(b.name.toLowerCase())
  );
}

/** Parse a single Bruno `.bru` request file. Throws when the text is
    not a recognizable `.bru` request. */
export function parseBruno(text: string): BrunoImportResult {
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error("Empty file — not a Bruno .bru request.");
  }
  const warnings: string[] = [];
  const blocks = tokenizeBlocks(text, warnings);

  const meta = blocks.find((b) => b.name.toLowerCase() === "meta");
  const metaDict = meta ? parseDict(meta.body) : [];
  const metaType = (dictGet(metaDict, "type") ?? "http").toLowerCase();

  const methodBlock = blocks.find((b) => HTTP_METHODS.has(b.name.toLowerCase()));
  if (!methodBlock && !meta) {
    throw new Error("Not a Bruno .bru file (no meta or HTTP-method block).");
  }
  if (!methodBlock) {
    throw new Error(`Bruno .bru has no HTTP-method block (meta.type "${metaType}").`);
  }

  const methodDict = parseDict(methodBlock.body);
  const method = methodBlock.name.toUpperCase();
  const url = dictGet(methodDict, "url") ?? "";

  const headersBlock = blocks.find((b) => b.name.toLowerCase() === "headers");
  const headers = dictToKv(headersBlock ? parseDict(headersBlock.body) : []);

  // Query params: Bruno's older `query` block and newer `params:query`
  // both feed our params grid. `params:path` has no UI surface yet.
  const queryBlock = blocks.find(
    (b) => b.name.toLowerCase() === "query" || b.name.toLowerCase() === "params:query"
  );
  const params = dictToKv(queryBlock ? parseDict(queryBlock.body) : []);
  if (blocks.some((b) => b.name.toLowerCase() === "params:path")) {
    warnings.push("path params (params:path) skipped — no path-variable UI yet.");
  }

  const auth = mapAuth(dictGet(methodDict, "auth"), blocks, warnings);
  const body = mapBody(dictGet(methodDict, "body"), blocks, warnings);

  if (metaType === "graphql") {
    warnings.push('meta.type "graphql" imported as a plain HTTP request.');
  }

  const name = dictGet(metaDict, "name")?.trim() || url.trim() || methodBlock.name.toUpperCase();

  const snapshot: RequestSnapshot = {
    method,
    url,
    params,
    headers,
    auth,
    body,
    gql: { query: "", vars: "" },
    isGraphql: false,
  };

  const items: CollectionItem[] = [
    {
      id: newId(),
      parentId: null,
      kind: "request",
      order: 0,
      name,
      request: snapshot,
    },
  ];

  return {
    items,
    envVars: {},
    warnings,
    collectionName: name,
    requestCount: 1,
    folderCount: 0,
  };
}
