/** Olgun Özoktaş geliştirdi · API Lab */
// OpenAPI 3.0 / 3.1 → collection importer.
//
// Walks `paths.*.{get,post,…}` and emits one request per operation,
// grouped into folders by the operation's first tag. Mirrors the
// CollectionItem shape the Postman / Insomnia importers produce so
// `useStore.importItems` consumes every format the same way.
//
// Specs arrive as JSON or YAML — `parseSpecText` tries JSON first
// (fast path for the big .json specs) then falls back to YAML.
//
// `$ref` resolution: local `#/…` pointers are resolved (with a cycle
// guard); external / file refs are skipped with a warning — first-
// pass importers cover the 80%, per the parent backlog item.
//
// What we map:  servers[0].url + path (path `{var}` → `:var`),
//   query + header parameters, requestBody example bodies, an auth
//   stub from the first securityScheme (type only — creds are the
//   user's to wire).
// What we warn-and-skip:  external $refs, cookie params, apiKey in
//   query/cookie, exotic http auth schemes.

import { parse as parseYaml } from "yaml";
import type { Auth, CollectionItem, KvRow, RequestSnapshot } from "../types";

export type OpenApiImportResult = {
  items: CollectionItem[];
  envVars: Record<string, string>;
  warnings: string[];
  collectionName: string;
  requestCount: number;
  folderCount: number;
};

const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options", "trace"];

// ---------- id seq ----------
let _seq = 0;
function newId(): string {
  _seq = (_seq + 1) % 1_000_000;
  return `oas_${Date.now().toString(36)}_${_seq}`;
}
export function __resetIdSeqForTesting(): void {
  _seq = 0;
}

// ---------- helpers ----------
type AnyObj = Record<string, unknown>;

function isObj(v: unknown): v is AnyObj {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function primitiveStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function emptyRow(): KvRow {
  return { enabled: true, k: "", v: "" };
}
function rowsOrEmpty(rows: KvRow[]): KvRow[] {
  return rows.length > 0 ? rows : [emptyRow()];
}

// JSON Pointer segment unescape (`~1` → `/`, `~0` → `~`).
function decodePointer(s: string): string {
  return s.replace(/~1/g, "/").replace(/~0/g, "~");
}

// Resolve a possibly-`$ref`'d node against the root document. Local
// `#/…` pointers are followed (chained refs + cycles handled);
// external refs yield `{}` plus a warning.
function resolveRef(doc: AnyObj, node: unknown, warnings: string[], seen?: Set<string>): unknown {
  if (!isObj(node) || typeof node.$ref !== "string") return node;
  const ref = node.$ref;
  if (!ref.startsWith("#/")) {
    warnings.push(`external $ref skipped: ${ref}`);
    return {};
  }
  const visited = seen ?? new Set<string>();
  if (visited.has(ref)) return {};
  visited.add(ref);
  let cur: unknown = doc;
  for (const part of ref.slice(2).split("/").map(decodePointer)) {
    if (!isObj(cur) && !Array.isArray(cur)) return {};
    cur = (cur as AnyObj)[part];
  }
  return resolveRef(doc, cur, warnings, visited);
}

// servers[0].url with `{var}` substituted by each variable's default.
function serverUrl(servers: unknown, warnings: string[]): string {
  if (!Array.isArray(servers) || servers.length === 0) return "";
  const s = servers[0];
  if (!isObj(s) || typeof s.url !== "string") return "";
  let url = s.url;
  if (isObj(s.variables)) {
    for (const [k, v] of Object.entries(s.variables)) {
      const def = isObj(v) ? v.default : undefined;
      if (def !== undefined) url = url.split(`{${k}}`).join(String(def));
    }
  }
  if (servers.length > 1) warnings.push(`spec has ${servers.length} servers — used the first.`);
  return url;
}

function substitutePathParams(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ":$1");
}

function joinUrl(base: string, path: string): string {
  if (base.endsWith("/") && path.startsWith("/")) return base.slice(0, -1) + path;
  return base + path;
}

// ---------- parameters / body / auth ----------
function collectParams(
  params: unknown,
  doc: AnyObj,
  warnings: string[]
): { query: KvRow[]; header: KvRow[] } {
  const query: KvRow[] = [];
  const header: KvRow[] = [];
  if (!Array.isArray(params)) return { query, header };
  for (const raw of params) {
    const p = resolveRef(doc, raw, warnings);
    if (!isObj(p) || typeof p.name !== "string") continue;
    const schema = isObj(p.schema) ? p.schema : undefined;
    const example = p.example ?? schema?.example ?? schema?.default;
    const row: KvRow = {
      enabled: p.required === true,
      k: p.name,
      v: primitiveStr(example),
    };
    if (p.in === "query") query.push(row);
    else if (p.in === "header") header.push(row);
    // `path` params are baked into the URL; `cookie` params are dropped.
  }
  return { query, header };
}

function extractExample(media: AnyObj, doc: AnyObj, warnings: string[]): unknown {
  if (media.example !== undefined) return media.example;
  if (isObj(media.examples)) {
    const first = Object.values(media.examples)[0];
    const ex = resolveRef(doc, first, warnings);
    if (isObj(ex) && "value" in ex) return ex.value;
  }
  const schema = resolveRef(doc, media.schema, warnings);
  if (isObj(schema) && schema.example !== undefined) return schema.example;
  return undefined;
}

function collectBody(
  requestBody: unknown,
  doc: AnyObj,
  warnings: string[]
): { body: { mode: "none" | "json" | "raw"; text: string }; contentType: string | null } {
  const rb = resolveRef(doc, requestBody, warnings);
  if (!isObj(rb) || !isObj(rb.content))
    return { body: { mode: "none", text: "" }, contentType: null };
  const types = Object.keys(rb.content);
  const ct = types.find((t) => t === "application/json" || t.endsWith("+json")) ?? types[0];
  if (!ct) return { body: { mode: "none", text: "" }, contentType: null };
  const media = resolveRef(doc, rb.content[ct], warnings);
  const example = isObj(media) ? extractExample(media, doc, warnings) : undefined;
  if (example === undefined) return { body: { mode: "none", text: "" }, contentType: ct };
  const isJson = ct === "application/json" || ct.endsWith("+json");
  if (isJson)
    return { body: { mode: "json", text: JSON.stringify(example, null, 2) }, contentType: ct };
  const text = typeof example === "string" ? example : JSON.stringify(example, null, 2);
  return { body: { mode: "raw", text }, contentType: ct };
}

function resolveAuth(security: unknown, schemes: AnyObj, doc: AnyObj, warnings: string[]): Auth {
  if (!Array.isArray(security) || security.length === 0) return { type: "none" };
  const req = security[0];
  if (!isObj(req)) return { type: "none" };
  const name = Object.keys(req)[0];
  if (!name) return { type: "none" };
  const scheme = resolveRef(doc, schemes[name], warnings);
  if (!isObj(scheme)) return { type: "none" };
  const type = String(scheme.type ?? "").toLowerCase();
  if (type === "http") {
    const s = String(scheme.scheme ?? "").toLowerCase();
    if (s === "bearer") return { type: "bearer", token: "" };
    if (s === "basic") return { type: "basic", user: "", pass: "" };
    warnings.push(`http auth scheme "${scheme.scheme}" not supported — wire it manually.`);
    return { type: "none" };
  }
  if (type === "apikey") {
    if (String(scheme.in ?? "").toLowerCase() !== "header") {
      warnings.push(`apiKey in "${scheme.in}" not supported (only header) — wire it manually.`);
      return { type: "none" };
    }
    return { type: "apikey", header: primitiveStr(scheme.name) || "X-API-Key", value: "" };
  }
  if (type === "oauth2" || type === "openidconnect") {
    warnings.push(
      `"${scheme.type}" auth imported as an empty OAuth2 stub — paste a token manually.`
    );
    return { type: "oauth2", oauth2: {} };
  }
  warnings.push(`auth type "${scheme.type}" not recognized — left as none.`);
  return { type: "none" };
}

// ---------- main entry ----------

/** Parse spec text — JSON first (fast path), YAML fallback. */
export function parseSpecText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return parseYaml(text);
  }
}

export function isOpenApiSpec(parsed: unknown): boolean {
  if (!isObj(parsed)) return false;
  return (
    typeof parsed.openapi === "string" && parsed.openapi.startsWith("3.") && isObj(parsed.paths)
  );
}

/** Parse an OpenAPI 3.x document (JSON or YAML text) into collection
    items. Throws on invalid text or a non-OpenAPI shape. */
export function parseOpenApi(text: string): OpenApiImportResult {
  let doc: unknown;
  try {
    doc = parseSpecText(text);
  } catch (e) {
    throw new Error(`Invalid spec: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isOpenApiSpec(doc)) {
    throw new Error("Not an OpenAPI 3.x document (need `openapi: 3.x` + a `paths` object).");
  }
  const root = doc as AnyObj;
  const warnings: string[] = [];

  const info = isObj(root.info) ? root.info : {};
  const collectionName = primitiveStr(info.title) || "OpenAPI import";
  const components = isObj(root.components) ? root.components : {};
  const schemes = isObj(components.securitySchemes) ? components.securitySchemes : {};
  const globalSecurity = root.security;

  const items: CollectionItem[] = [];
  let orderSeq = 0;
  let requestCount = 0;
  const folderByTag = new Map<string, string>();

  const folderId = (tag: string): string => {
    const existing = folderByTag.get(tag);
    if (existing) return existing;
    const id = newId();
    folderByTag.set(tag, id);
    items.push({ id, parentId: null, kind: "folder", order: orderSeq++, name: tag });
    return id;
  };

  const paths = isObj(root.paths) ? root.paths : {};
  for (const [rawPath, pathItemRaw] of Object.entries(paths)) {
    const pathItem = resolveRef(root, pathItemRaw, warnings);
    if (!isObj(pathItem)) continue;
    const pathParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!isObj(op)) continue;
      const opParams = Array.isArray(op.parameters) ? op.parameters : [];
      const { query, header } = collectParams([...pathParams, ...opParams], root, warnings);
      const { body, contentType } = collectBody(op.requestBody, root, warnings);
      if (contentType && !header.some((h) => h.k.toLowerCase() === "content-type")) {
        header.push({ enabled: true, k: "Content-Type", v: contentType });
      }
      const servers = op.servers ?? pathItem.servers ?? root.servers;
      const url = joinUrl(serverUrl(servers, warnings), substitutePathParams(rawPath));
      const auth = resolveAuth(op.security ?? globalSecurity, schemes, root, warnings);
      const name =
        primitiveStr(op.summary) ||
        primitiveStr(op.operationId) ||
        `${method.toUpperCase()} ${rawPath}`;
      const tag = Array.isArray(op.tags) && typeof op.tags[0] === "string" ? op.tags[0] : null;
      const request: RequestSnapshot = {
        method: method.toUpperCase(),
        url,
        params: rowsOrEmpty(query),
        headers: rowsOrEmpty(header),
        auth,
        body,
        gql: { query: "", vars: "" },
        isGraphql: false,
      };
      items.push({
        id: newId(),
        parentId: tag ? folderId(tag) : null,
        kind: "request",
        order: orderSeq++,
        name,
        request,
      });
      requestCount++;
    }
  }

  return {
    items,
    envVars: {},
    warnings,
    collectionName,
    requestCount,
    folderCount: folderByTag.size,
  };
}
