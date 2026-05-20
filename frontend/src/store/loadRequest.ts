/** Olgun Özoktaş geliştirdi · API Lab */
// Shared request-loading state mapping. Five loaders pull a request
// into a tab — loadCollection / loadHistoryItem / loadSample (in-place,
// store/current.ts) and loadCollectionInNewTab / openHistoryItemInNewTab
// (new tab, store/tabs.ts). They each hand-built the loaded-tab state
// and had drifted: the in-place loaders forgot to reset the response
// panel (the response-panel-reset-on-request-load bug). This module is
// the single definition of what "a freshly-loaded request" means, so
// the loaders can't diverge again.
import type { ComposerTab, CurrentRequest, RequestSnapshot, ResponseTab } from "../lib/types";
import { clone } from "./internal";

// Build a CurrentRequest from a saved-collection / history
// RequestSnapshot. The `?? defaults` guard a partial snapshot (old
// persisted collection data); history snapshots are always complete,
// so the defaults never fire there — behaviour is identical for both.
export function currentFromSnapshot(
  r: RequestSnapshot,
  id: string | null,
  name: string
): CurrentRequest {
  return {
    id,
    name,
    method: r.method ?? "GET",
    url: r.url ?? "",
    params: clone(r.params ?? [{ enabled: true, k: "", v: "" }]),
    headers: clone(r.headers ?? [{ enabled: true, k: "", v: "" }]),
    auth: clone(r.auth ?? { type: "none" }),
    body: clone(r.body ?? { mode: "none", text: "" }),
    gql: clone(r.gql ?? { query: "", vars: "" }),
    // Protocol-specific state — only present for gRPC / MCP requests
    // (and isGraphql for GraphQL). Loaders that forgot to copy these
    // silently dropped them on ⌘S → reopen — the latent gRPC bug
    // that this restores. Conditional spreads keep the fields absent
    // (rather than `undefined`) on HTTP requests so the loaded shape
    // stays tight.
    ...(r.isGraphql !== undefined ? { isGraphql: r.isGraphql } : {}),
    ...(r.grpc ? { grpc: clone(r.grpc) } : {}),
    ...(r.mcp ? { mcp: clone(r.mcp) } : {}),
  };
}

// The composer tab a freshly-loaded saved/history request opens on.
export function composerTabFor(isGraphql: boolean | undefined): ComposerTab {
  return isGraphql ? "graphql" : "params";
}

// The canonical state of a request freshly loaded into a tab. Every
// loader builds its CurrentRequest + composerTab, then routes through
// `buildLoadedRequestState` so the response panel ALWAYS resets:
// responseTab to Body, lastResponse cleared. Bundling the four fields
// means a loader can't silently forget one — the drift this module
// exists to prevent.
export type LoadedTabState = {
  current: CurrentRequest;
  composerTab: ComposerTab;
  responseTab: ResponseTab;
  lastResponse: null;
};

export function buildLoadedRequestState(
  current: CurrentRequest,
  composerTab: ComposerTab
): LoadedTabState {
  return { current, composerTab, responseTab: "body", lastResponse: null };
}
