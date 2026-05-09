// Postman v2.1 collection importer.
//
// Walks a v2.1 schema (https://schema.postman.com/json/collection/v2.1.0/collection.json)
// and produces an array of CollectionItem objects ready to merge into the
// store's `collectionItems` array. Variables become a flat env-vars
// record. Pre-request and test scripts pass through into the new
// preScript / postScript fields (Phase H.1 ship made these executable).
//
// What we DO map:
//   - folders + nested folders + requests (recursive item[] walk)
//   - request method, url (string + structured), headers, body
//     (raw / urlencoded / formdata text-only / file omitted), auth
//     (bearer / basic / apikey / oauth2 stub)
//   - events (prerequest, test) → preScript / postScript
//   - top-level variable[] → envVars record
//
// What we DON'T map (with a warning surfaced to the caller):
//   - file uploads in formdata (no FormData primitive in our body model)
//   - graphql body (we use a separate gql field; deferred)
//   - oauth2 access-token auto-fetch (helper variant only paste-token)
//   - protocolProfileBehavior (not user-visible)

import type { Auth, CollectionItem, KvRow, RequestSnapshot } from "../types";

export type ImportResult = {
  items: CollectionItem[];
  envVars: Record<string, string>;
  warnings: string[];
  // Top-level info — surfaced in the import summary toast.
  collectionName: string;
  requestCount: number;
  folderCount: number;
};

// Minimal v2.1 schema slice — we only model the fields we read.
type PmAuth = {
  type?: string;
  bearer?: PmKv[] | { token?: string };
  basic?: PmKv[] | { username?: string; password?: string };
  apikey?: PmKv[] | { key?: string; value?: string; in?: string };
  oauth2?: PmKv[] | { accessToken?: string };
};
type PmKv = { key: string; value?: string; type?: string; disabled?: boolean };
type PmUrl =
  | string
  | {
      raw?: string;
      protocol?: string;
      host?: string | string[];
      path?: string | string[];
      query?: PmKv[];
    };
type PmBody = {
  mode?: "raw" | "urlencoded" | "formdata" | "file" | "graphql";
  raw?: string;
  urlencoded?: PmKv[];
  formdata?: (PmKv & { src?: string | string[]; type?: string })[];
  options?: { raw?: { language?: string } };
  graphql?: { query?: string; variables?: string };
};
type PmEvent = {
  listen?: "prerequest" | "test";
  script?: { exec?: string | string[]; type?: string };
};
type PmRequest =
  | string
  | {
      method?: string;
      url?: PmUrl;
      header?: PmKv[];
      body?: PmBody;
      auth?: PmAuth;
    };
type PmItem = {
  name?: string;
  item?: PmItem[]; // present → folder
  request?: PmRequest;
  event?: PmEvent[];
  auth?: PmAuth; // folder-level auth inheritance is a Postman feature; we copy down
};
type PmCollection = {
  info?: { name?: string; schema?: string };
  item?: PmItem[];
  variable?: PmKv[];
  auth?: PmAuth;
  event?: PmEvent[];
};

let _seq = 0;
function newId() {
  // Don't depend on Date.now alone — multiple imports inside one
  // millisecond would collide.
  _seq = (_seq + 1) % 1_000_000;
  return `pm_${Date.now().toString(36)}_${_seq}`;
}
export function __resetIdSeqForTesting() {
  _seq = 0;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function pmEventsToScripts(events: PmEvent[] | undefined): {
  preScript?: string;
  postScript?: string;
} {
  const out: { preScript?: string; postScript?: string } = {};
  for (const ev of events ?? []) {
    const exec = ev.script?.exec;
    const text = Array.isArray(exec) ? exec.join("\n") : (exec ?? "");
    const trimmed = text.trim();
    if (!trimmed) continue;
    if (ev.listen === "prerequest") out.preScript = text;
    else if (ev.listen === "test") out.postScript = text;
  }
  return out;
}

function pmHeadersToKv(headers: PmKv[] | undefined): KvRow[] {
  const rows: KvRow[] = (headers ?? [])
    .filter((h) => h && h.key !== undefined)
    .map((h) => ({
      enabled: !h.disabled,
      k: h.key,
      v: h.value ?? "",
    }));
  if (rows.length === 0) rows.push({ enabled: true, k: "", v: "" });
  return rows;
}

function pmUrlToString(u: PmUrl | undefined): {
  url: string;
  params: KvRow[];
} {
  if (!u) return { url: "", params: [{ enabled: true, k: "", v: "" }] };
  if (typeof u === "string") return { url: u, params: emptyParams() };
  if (u.raw) {
    return { url: u.raw, params: queryToParams(u.query) };
  }
  // Reconstruct from parts.
  const proto = u.protocol ? u.protocol + "://" : "";
  const host = Array.isArray(u.host) ? u.host.join(".") : u.host || "";
  const path = Array.isArray(u.path) ? u.path.join("/") : u.path || "";
  const url = proto + host + (path ? (path.startsWith("/") ? path : "/" + path) : "");
  return { url, params: queryToParams(u.query) };
}
function emptyParams(): KvRow[] {
  return [{ enabled: true, k: "", v: "" }];
}
function queryToParams(q: PmKv[] | undefined): KvRow[] {
  const rows: KvRow[] = (q ?? [])
    .filter((p) => p && p.key !== undefined)
    .map((p) => ({
      enabled: !p.disabled,
      k: p.key,
      v: p.value ?? "",
    }));
  if (rows.length === 0) rows.push({ enabled: true, k: "", v: "" });
  return rows;
}

function pmAuthToAuth(pmAuth: PmAuth | undefined, warnings: string[]): Auth {
  if (!pmAuth || !pmAuth.type) return { type: "none" };
  const grab = (
    bag: PmKv[] | { [k: string]: string | undefined } | undefined,
    key: string
  ): string | undefined => {
    if (!bag) return undefined;
    if (Array.isArray(bag)) {
      const found = bag.find((kv) => kv.key === key);
      return found?.value;
    }
    return (bag as { [k: string]: string | undefined })[key];
  };
  switch (pmAuth.type) {
    case "bearer":
      return { type: "bearer", token: grab(pmAuth.bearer, "token") || "" };
    case "basic":
      return {
        type: "basic",
        user: grab(pmAuth.basic, "username") || "",
        pass: grab(pmAuth.basic, "password") || "",
      };
    case "apikey": {
      const where = grab(pmAuth.apikey, "in") || "header";
      if (where !== "header") {
        warnings.push(
          `apikey "in: ${where}" not yet supported (only header) — leaving auth as apikey/header`
        );
      }
      return {
        type: "apikey",
        header: grab(pmAuth.apikey, "key") || "X-API-Key",
        value: grab(pmAuth.apikey, "value") || "",
      };
    }
    case "oauth2": {
      const at = grab(pmAuth.oauth2, "accessToken") || "";
      return { type: "oauth2", oauth2: { access_token: at } };
    }
    case "noauth":
    case undefined:
      return { type: "none" };
    default:
      warnings.push(`auth type "${pmAuth.type}" not supported — request will fall back to none`);
      return { type: "none" };
  }
}

function pmBodyToRequest(
  body: PmBody | undefined,
  warnings: string[]
): { mode: RequestSnapshot["body"]["mode"]; text: string } {
  if (!body || !body.mode) return { mode: "none", text: "" };
  switch (body.mode) {
    case "raw": {
      const lang = body.options?.raw?.language;
      const mode: RequestSnapshot["body"]["mode"] = lang === "json" ? "json" : "raw";
      return { mode, text: body.raw ?? "" };
    }
    case "urlencoded": {
      const text = (body.urlencoded ?? [])
        .filter((kv) => !kv.disabled && kv.key)
        .map((kv) => encodeURIComponent(kv.key) + "=" + encodeURIComponent(kv.value ?? ""))
        .join("&");
      return { mode: "form", text };
    }
    case "formdata":
      warnings.push(
        "formdata body imported as raw text — file uploads omitted (Phase E.1 follow-up)"
      );
      return {
        mode: "raw",
        text: (body.formdata ?? [])
          .filter((kv) => !kv.disabled && kv.key)
          .map((kv) =>
            kv.type === "file"
              ? `# ${kv.key}: <file ${Array.isArray(kv.src) ? kv.src.join(", ") : (kv.src ?? "")}>`
              : `${kv.key}=${kv.value ?? ""}`
          )
          .join("\n"),
      };
    case "file":
      warnings.push("binary file body not supported — empty body");
      return { mode: "none", text: "" };
    case "graphql":
      warnings.push("GraphQL bodies imported as JSON — manual move to GraphQL tab needed");
      return {
        mode: "json",
        text: JSON.stringify({
          query: body.graphql?.query ?? "",
          variables: body.graphql?.variables ?? "",
        }),
      };
    default:
      return { mode: "none", text: "" };
  }
}

function buildRequestSnapshot(
  pm: PmRequest,
  events: PmEvent[] | undefined,
  inheritedAuth: PmAuth | undefined,
  warnings: string[]
): RequestSnapshot {
  if (typeof pm === "string") {
    return {
      method: "GET",
      url: pm,
      params: emptyParams(),
      headers: [{ enabled: true, k: "", v: "" }],
      auth: pmAuthToAuth(inheritedAuth, warnings),
      body: { mode: "none", text: "" },
      gql: { query: "", vars: "" },
      ...pmEventsToScripts(events),
    };
  }
  const method = (pm.method || "GET").toUpperCase();
  const { url, params } = pmUrlToString(pm.url);
  const headers = pmHeadersToKv(pm.header);
  const auth = pmAuthToAuth(pm.auth ?? inheritedAuth, warnings);
  const body = pmBodyToRequest(pm.body, warnings);
  return {
    method,
    url,
    params,
    headers,
    auth,
    body,
    gql: { query: "", vars: "" },
    ...pmEventsToScripts(events),
  };
}

type WalkContext = {
  out: CollectionItem[];
  warnings: string[];
  rootAuth: PmAuth | undefined;
  counts: { folders: number; requests: number };
};

function walkItems(
  items: PmItem[] | undefined,
  parentId: string | null,
  inheritedAuth: PmAuth | undefined,
  ctx: WalkContext,
  startOrder = 0
): void {
  if (!items) return;
  let order = startOrder;
  for (const it of items) {
    if (Array.isArray(it.item)) {
      // Folder
      const folderId = newId();
      const folderAuth = it.auth ?? inheritedAuth;
      ctx.out.push({
        id: folderId,
        parentId,
        kind: "folder",
        order: order++,
        name: it.name?.trim() || "Folder",
      });
      ctx.counts.folders += 1;
      walkItems(it.item, folderId, folderAuth, ctx, 0);
    } else if (it.request !== undefined) {
      // Request
      const id = newId();
      const snapshot = buildRequestSnapshot(it.request, it.event, inheritedAuth, ctx.warnings);
      ctx.out.push({
        id,
        parentId,
        kind: "request",
        order: order++,
        name: it.name?.trim() || "Request",
        request: snapshot,
      });
      ctx.counts.requests += 1;
    }
  }
}

export function parsePostmanV2(raw: string | unknown): ImportResult {
  let parsed: unknown;
  if (typeof raw === "string") {
    parsed = JSON.parse(raw);
  } else {
    parsed = raw;
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Empty or non-object Postman collection");
  }
  const c = parsed as PmCollection;
  // Schema sanity: we accept v2.1 strictly but tolerate v2.0 (best-effort).
  if (c.info?.schema && !c.info.schema.includes("/collection/")) {
    throw new Error(`Not a Postman collection schema: ${c.info.schema}`);
  }

  const ctx: WalkContext = {
    out: [],
    warnings: [],
    rootAuth: c.auth,
    counts: { folders: 0, requests: 0 },
  };
  walkItems(c.item, null, c.auth, ctx, 0);

  const envVars: Record<string, string> = {};
  for (const v of c.variable ?? []) {
    if (v.key && !v.disabled) envVars[v.key] = v.value ?? "";
  }

  return {
    items: ctx.out,
    envVars,
    warnings: ctx.warnings,
    collectionName: c.info?.name ?? "Imported collection",
    requestCount: ctx.counts.requests,
    folderCount: ctx.counts.folders,
  };
}
