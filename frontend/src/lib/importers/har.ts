/** Olgun Özoktaş geliştirdi · API Lab */
// HAR 1.2 importer.
//
// HAR ("HTTP Archive") is Chrome / Firefox / Charles / mitmproxy /
// Insomnia / Postman's "save as ..." format for captured request
// traces. Each entry has a real request + a real response + timings —
// perfect material for our History pane, which is the same shape.
//
// HAR is NOT a collections format. Per the parent backlog item
// (P2-2026-05-09-171400) we deliberately route HAR into History, not
// Collections, since:
//   - HAR entries have no human names (you couldn't disambiguate two
//     `/api/users` calls).
//   - The point of HAR is "replay something I observed", which is
//     the History pane's job.
//   - A 200-row Chrome capture would balloon Collections with junk.
//
// Spec: https://w3c.github.io/web-performance/specs/HAR/Overview.html

import type { HistoryItem, KvRow, RequestSnapshot } from "../types";
import { uid } from "../utils";

export type HarImportResult = {
  items: HistoryItem[];
  warnings: string[];
  /** Total entries seen in the HAR, including any we couldn't map.
      `items.length` may be smaller — surfaced in the import-summary
      toast so the user knows if entries were skipped. */
  totalEntries: number;
  // Pseudo-name + counts so the existing import-summary toast
  // (originally for Postman) can render uniformly. `requestCount`
  // == items.length (HAR entries become requests in History).
  collectionName: string;
  folderCount: number;
  requestCount: number;
};

// ---------- HAR 1.2 schema slice (only fields we read) ----------
type HarNameValue = { name?: string; value?: string };
type HarPostData = { mimeType?: string; text?: string };
type HarRequest = {
  method?: string;
  url?: string;
  headers?: HarNameValue[];
  queryString?: HarNameValue[];
  postData?: HarPostData;
};
type HarContent = {
  mimeType?: string;
  text?: string;
  size?: number;
};
type HarResponse = {
  status?: number;
  statusText?: string;
  headers?: HarNameValue[];
  content?: HarContent;
};
type HarEntry = {
  startedDateTime?: string;
  time?: number;
  request?: HarRequest;
  response?: HarResponse;
};
type HarFile = {
  log?: {
    version?: string;
    entries?: HarEntry[];
    creator?: { name?: string; version?: string };
  };
};

// ---------- helpers ----------

function emptyRow(): KvRow {
  return { enabled: true, k: "", v: "" };
}

function nameValueToKv(rows: HarNameValue[] | undefined): KvRow[] {
  const out: KvRow[] = (rows ?? [])
    .filter((r) => r && r.name !== undefined)
    .map((r) => ({ enabled: true, k: r.name ?? "", v: r.value ?? "" }));
  if (out.length === 0) out.push(emptyRow());
  return out;
}

function bodyFromPostData(
  post: HarPostData | undefined,
  warnings: string[]
): { mode: "none" | "json" | "raw"; text: string } {
  if (!post || !post.text) return { mode: "none", text: "" };
  const mime = (post.mimeType ?? "").toLowerCase();
  if (mime === "application/json" || mime.endsWith("+json")) {
    return { mode: "json", text: post.text };
  }
  if (mime === "application/x-www-form-urlencoded") {
    warnings.push("urlencoded HAR body imported as raw text.");
    return { mode: "raw", text: post.text };
  }
  if (mime.startsWith("multipart/")) {
    warnings.push("multipart HAR body skipped (no FormData primitive yet).");
    return { mode: "none", text: "" };
  }
  return { mode: "raw", text: post.text };
}

function parseTs(iso: string | undefined, fallback: number): number {
  if (!iso) return fallback;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : fallback;
}

// ---------- main entry ----------

export function isHarFile(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const h = parsed as HarFile;
  return (
    !!h.log &&
    typeof h.log === "object" &&
    typeof h.log.version === "string" &&
    h.log.version.startsWith("1.") &&
    Array.isArray(h.log.entries)
  );
}

/** Parse a HAR file (1.2 spec, also accepts 1.1) and return
    HistoryItems ready to prepend via store.importHistory(). */
export function parseHar(jsonText: string): HarImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isHarFile(parsed)) {
    throw new Error("Not a HAR file (missing log.version / log.entries).");
  }
  const har = parsed as HarFile;
  const entries = har.log!.entries ?? [];
  const warnings: string[] = [];
  const items: HistoryItem[] = [];
  // Track the earliest startedDateTime for the import-summary label.
  // HAR doesn't have a "collection name" so we synthesize one from the
  // creator + entry-count, matching the Postman/Insomnia summary shape.
  const creator = har.log?.creator?.name ?? "HAR";
  const collectionName = `${creator} HAR (${entries.length} entries)`;

  for (const e of entries) {
    const req = e.request;
    if (!req || !req.url) {
      warnings.push("HAR entry missing request.url — skipped.");
      continue;
    }
    const snap: RequestSnapshot = {
      method: (req.method ?? "GET").toUpperCase(),
      url: req.url,
      params: nameValueToKv(req.queryString),
      headers: nameValueToKv(req.headers),
      auth: { type: "none" },
      body: bodyFromPostData(req.postData, warnings),
      gql: { query: "", vars: "" },
      isGraphql: false,
    };
    const res = e.response;
    const status = res?.status ?? 0;
    const sizeBytes = res?.content?.size ?? res?.content?.text?.length ?? 0;
    const elapsedMs = Math.round(e.time ?? 0);
    items.push({
      id: uid(),
      ts: parseTs(e.startedDateTime, Date.now()),
      request: snap,
      response: { status, sizeBytes, elapsedMs },
    });
  }

  return {
    items,
    warnings,
    totalEntries: entries.length,
    collectionName,
    folderCount: 0,
    requestCount: items.length,
  };
}
