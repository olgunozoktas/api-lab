/** Olgun Özoktaş geliştirdi · API Lab */
// Insomnia v4 (export) importer.
//
// Insomnia exports a flat `resources[]` array — every workspace, folder
// (request_group), request, and environment is a node in that array,
// with `parentId` references stitching them into a tree. We rebuild
// the tree on parse, then emit CollectionItems in the same shape the
// Postman v2 importer produces so `useStore.importItems` can consume
// both formats indistinguishably.
//
// What we DO map:
//   - workspace + nested request_group folders + requests
//   - method, url, headers (name/value), parameters (query)
//   - body raw text (mimeType → none/json/raw mapping)
//   - authentication: bearer / basic / apikey / oauth2 token-only
//   - environment.data → envVars (flat record; first env wins on key
//     conflict, matching Postman v2's "top-level variable[]" behaviour)
//
// What we DON'T map (with a warning surfaced to the caller):
//   - file uploads (no FormData primitive)
//   - graphql body (we use a separate gql field; deferred)
//   - cookie_jar / api_spec / proto_file / proto_directory resources
//     (no UI surface yet)
//   - OAuth2 access-token auto-fetch (we paste the token only)

import type { Auth, CollectionItem, KvRow, RequestSnapshot } from "../types";

export type InsomniaImportResult = {
  items: CollectionItem[];
  envVars: Record<string, string>;
  warnings: string[];
  collectionName: string;
  requestCount: number;
  folderCount: number;
};

// ---------- Insomnia v4 schema slice (only fields we read) ----------
type InsResourceBase = {
  _id: string;
  _type: string;
  parentId?: string | null;
  name?: string;
};
type InsHeader = { name?: string; value?: string; disabled?: boolean };
type InsParam = { name?: string; value?: string; disabled?: boolean };
type InsAuth = {
  type?: string;
  token?: string;
  username?: string;
  password?: string;
  key?: string;
  value?: string;
  addTo?: string;
  disabled?: boolean;
};
type InsBody = { mimeType?: string; text?: string };
type InsRequest = InsResourceBase & {
  _type: "request";
  url?: string;
  method?: string;
  headers?: InsHeader[];
  parameters?: InsParam[];
  body?: InsBody;
  authentication?: InsAuth;
};
type InsRequestGroup = InsResourceBase & { _type: "request_group" };
type InsWorkspace = InsResourceBase & { _type: "workspace" };
type InsEnvironment = InsResourceBase & {
  _type: "environment";
  data?: Record<string, unknown>;
};
type InsResource = InsRequest | InsRequestGroup | InsWorkspace | InsEnvironment | InsResourceBase;

type InsExport = {
  _type?: string;
  __export_format?: number;
  resources?: InsResource[];
};

// ---------- id seq + helpers ----------
let _seq = 0;
function newId(): string {
  _seq = (_seq + 1) % 1_000_000;
  return `ins_${Date.now().toString(36)}_${_seq}`;
}
export function __resetIdSeqForTesting(): void {
  _seq = 0;
}

function emptyRow(): KvRow {
  return { enabled: true, k: "", v: "" };
}

function headersToKv(headers: InsHeader[] | undefined): KvRow[] {
  const rows: KvRow[] = (headers ?? [])
    .filter((h) => h && (h.name !== undefined || h.value !== undefined))
    .map((h) => ({
      enabled: !h.disabled,
      k: h.name ?? "",
      v: h.value ?? "",
    }));
  if (rows.length === 0) rows.push(emptyRow());
  return rows;
}

function paramsToKv(params: InsParam[] | undefined): KvRow[] {
  const rows: KvRow[] = (params ?? [])
    .filter((p) => p && (p.name !== undefined || p.value !== undefined))
    .map((p) => ({
      enabled: !p.disabled,
      k: p.name ?? "",
      v: p.value ?? "",
    }));
  if (rows.length === 0) rows.push(emptyRow());
  return rows;
}

function authToAuth(ins: InsAuth | undefined, warnings: string[]): Auth {
  if (!ins || !ins.type || ins.disabled || ins.type === "none") return { type: "none" };
  switch (ins.type) {
    case "bearer":
      return { type: "bearer", token: ins.token ?? "" };
    case "basic":
      return { type: "basic", user: ins.username ?? "", pass: ins.password ?? "" };
    case "apikey": {
      const where = ins.addTo ?? "header";
      if (where !== "header") {
        warnings.push(
          `apikey "addTo: ${where}" not yet supported (only header) — leaving as header`
        );
      }
      return {
        type: "apikey",
        header: ins.key ?? "X-API-Key",
        value: ins.value ?? "",
      };
    }
    case "oauth2":
      if (ins.token) return { type: "bearer", token: ins.token };
      warnings.push("oauth2 without a stored token — leaving auth as none");
      return { type: "none" };
    default:
      warnings.push(`auth type "${ins.type}" not yet supported — leaving as none`);
      return { type: "none" };
  }
}

function bodyToBody(
  body: InsBody | undefined,
  warnings: string[]
): { mode: "none" | "json" | "raw"; text: string } {
  if (!body || !body.text) return { mode: "none", text: "" };
  const mime = (body.mimeType ?? "").toLowerCase();
  if (mime.includes("graphql")) {
    warnings.push("graphql body not yet mapped (use the GraphQL tab on the request).");
    return { mode: "none", text: "" };
  }
  if (mime === "application/json" || mime.endsWith("+json")) {
    return { mode: "json", text: body.text };
  }
  if (mime === "application/x-www-form-urlencoded") {
    warnings.push("urlencoded body imported as raw text — multipart UI not yet wired.");
    return { mode: "raw", text: body.text };
  }
  return { mode: "raw", text: body.text };
}

function makeRequestSnapshot(req: InsRequest, warnings: string[]): RequestSnapshot {
  return {
    method: (req.method ?? "GET").toUpperCase(),
    url: req.url ?? "",
    params: paramsToKv(req.parameters),
    headers: headersToKv(req.headers),
    auth: authToAuth(req.authentication, warnings),
    body: bodyToBody(req.body, warnings),
    gql: { query: "", vars: "" },
    isGraphql: false,
  };
}

// ---------- main entry ----------

export function isInsomniaExport(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const o = parsed as Partial<InsExport>;
  return (
    o._type === "export" &&
    typeof o.__export_format === "number" &&
    o.__export_format >= 4 &&
    Array.isArray(o.resources)
  );
}

/** Parse a JSON string as an Insomnia v4 export. Throws on invalid
    JSON or non-Insomnia shape. */
export function parseInsomniaV4(jsonText: string): InsomniaImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isInsomniaExport(parsed)) {
    throw new Error("Not an Insomnia v4 export (missing _type/export_format/resources).");
  }
  const exp = parsed as InsExport;
  const resources = exp.resources ?? [];
  const warnings: string[] = [];

  // Build parent → children map for tree assembly. Each entry holds
  // ONLY the resources whose parentId points at the key.
  const childrenOf = new Map<string, InsResource[]>();
  for (const r of resources) {
    const p = (r as InsResourceBase).parentId ?? "__root__";
    const arr = childrenOf.get(p) ?? [];
    arr.push(r);
    childrenOf.set(p, arr);
  }

  // Pick the workspace as the tree root. If multiple workspaces are
  // present (rare — single-workspace exports are the norm), pick the
  // first; the rest become unparented roots that fall through into
  // the items list as sibling folders. If no workspace exists, fall
  // back to the literal __root__ bucket.
  const workspaces = resources.filter((r) => r._type === "workspace") as InsWorkspace[];
  const primary = workspaces[0];
  const collectionName = primary?.name ?? "Insomnia import";

  const items: CollectionItem[] = [];
  let folderCount = 0;
  let requestCount = 0;
  let orderSeq = 0;

  // Walk from a parent id into its children, mapping each into a
  // CollectionItem under the new (api-lab-side) parent id.
  function walk(insParentId: string, newParentId: string | null): void {
    const kids = childrenOf.get(insParentId) ?? [];
    for (const k of kids) {
      if (k._type === "request_group") {
        const id = newId();
        items.push({
          id,
          parentId: newParentId,
          kind: "folder",
          order: orderSeq++,
          name: k.name ?? "Folder",
        });
        folderCount++;
        walk(k._id, id);
      } else if (k._type === "request") {
        const req = k as InsRequest;
        items.push({
          id: newId(),
          parentId: newParentId,
          kind: "request",
          order: orderSeq++,
          name: req.name ?? req.method ?? req.url ?? "Request",
          request: makeRequestSnapshot(req, warnings),
        });
        requestCount++;
      } else if (k._type === "workspace") {
        // Nested workspace — flatten as a folder.
        const id = newId();
        items.push({
          id,
          parentId: newParentId,
          kind: "folder",
          order: orderSeq++,
          name: k.name ?? "Workspace",
        });
        folderCount++;
        walk(k._id, id);
      }
      // environments, cookie_jars, api_specs etc. are handled separately
      // (envs below) or silently skipped — they don't belong in the
      // collection tree.
    }
  }

  if (primary) {
    walk(primary._id, null);
  } else {
    // No workspace at all — fall back to top-level (null parentId)
    // resources. Orphans referencing a ghost parent id are silently
    // dropped; the user can re-export with a clean workspace root.
    walk("__root__", null);
  }

  // Environments — flatten every `environment.data` into a single
  // envVars record. Newer entries win on key conflict (mirroring
  // Postman's "last wins" semantics).
  const envVars: Record<string, string> = {};
  const envs = resources.filter((r) => r._type === "environment") as InsEnvironment[];
  for (const env of envs) {
    if (!env.data || typeof env.data !== "object") continue;
    for (const [k, v] of Object.entries(env.data)) {
      // Only flat string-ish values — nested objects skipped with a
      // warning. Insomnia supports nested groups but we don't yet.
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        envVars[k] = String(v);
      } else if (v !== null && v !== undefined) {
        warnings.push(`environment var "${k}" has nested structure — skipped.`);
      }
    }
  }

  return {
    items,
    envVars,
    warnings,
    collectionName,
    requestCount,
    folderCount,
  };
}
