/** Olgun Özoktaş geliştirdi · API Lab */
// Turn a curated provider definition into importable collection items.
// Pure — no bridge, no fetch — so a curated integration never hits the
// size / endpoint-volume walls that block full OpenAPI auto-fetch, and
// the builder is unit-testable on its own.
import { uid } from "../../utils";
import type { CollectionItem, RequestSnapshot } from "../../types";
import type { CuratedEndpoint, CuratedProvider } from "./types";

export type CuratedBuildResult = {
  items: CollectionItem[];
  requestCount: number;
  folderCount: number;
};

// A request snapshot for a curated endpoint. Auth stays `none` here —
// IntegrationsModal applies the provider's scaffolded auth to every
// imported request afterwards. A `graphql` endpoint arrives in GraphQL
// mode (POST is the only verb GraphQL uses). A curated `body` skeleton
// seeds the body for REST endpoints; it's ignored on graphql ones,
// which carry their payload in the gql query.
function curatedSnapshot(
  method: string,
  url: string,
  graphql: boolean,
  body: CuratedEndpoint["body"]
): RequestSnapshot {
  return {
    method: graphql ? "POST" : method,
    url,
    params: [{ enabled: true, k: "", v: "" }],
    headers: [{ enabled: true, k: "", v: "" }],
    auth: { type: "none" },
    body: body && !graphql ? { mode: body.mode, text: body.text } : { mode: "none", text: "" },
    gql: { query: "", vars: "" },
    isGraphql: graphql || undefined,
  };
}

// Build the collection tree for a curated provider. Endpoints sharing
// a `group` land in a sub-folder; ungrouped endpoints sit at the root.
// Root-level nodes carry `parentId: null` so `importItems` reparents
// them under the integration's wrapper folder.
export function buildCuratedItems(provider: CuratedProvider): CuratedBuildResult {
  const items: CollectionItem[] = [];
  // group name → folder id, created lazily in first-seen order.
  const folders = new Map<string, string>();
  let order = 0;

  for (const ep of provider.endpoints) {
    let parentId: string | null = null;
    if (ep.group) {
      let folderId = folders.get(ep.group);
      if (folderId === undefined) {
        folderId = uid();
        folders.set(ep.group, folderId);
        items.push({
          id: folderId,
          parentId: null,
          kind: "folder",
          name: ep.group,
          order: order++,
        });
      }
      parentId = folderId;
    }
    items.push({
      id: uid(),
      parentId,
      kind: "request",
      name: ep.name,
      order: order++,
      request: curatedSnapshot(ep.method, provider.baseUrl + ep.path, ep.graphql ?? false, ep.body),
      ...(ep.description ? { description: ep.description } : {}),
    });
  }

  return {
    items,
    requestCount: provider.endpoints.length,
    folderCount: folders.size,
  };
}
