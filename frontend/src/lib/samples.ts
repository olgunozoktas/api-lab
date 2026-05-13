/** Olgun Özoktaş geliştirdi · API Lab */

// Built-in sample requests — a small, hardcoded catalog covering every
// protocol API Lab supports, so a fresh user can click "Send" within
// seconds instead of staring at an empty composer.
//
// Samples live in the bundle, not in the user's saved collections.
// They render in the Sidebar's "Samples" section above Collections.
// Hiding a sample is a per-id boolean in IndexedDB (see store/samples.ts);
// the manifest itself is rebuild constants and can never be deleted —
// "always reach" surfaces (⌘P, Settings → Sample Requests, empty-state
// CTA) read directly from this list regardless of the hidden set.
//
// URLs point at public test services. They go down sometimes; the
// Sample description i18n key warns about this. Once Phase J's bundled
// Zig mock-server ships, these defaults can point at localhost.

export type SampleKind = "http" | "graphql" | "ws" | "sse" | "grpc";

export type SampleHeader = { k: string; v: string };

export type Sample = {
  /** Stable id — used as the IndexedDB key for hidden-state and as the
      QuickSwitcher match anchor. Never change once shipped; renaming
      breaks the user's "hidden" persistence. */
  id: string;
  kind: SampleKind;
  /** i18n key for the display name (e.g. "samples.httpGet.name"). */
  nameKey: string;
  /** i18n key for the one-line description shown on hover / in
      Settings → Sample Requests. */
  descriptionKey: string;
  /** HTTP method (HTTP + GraphQL only). Ignored for ws/sse/grpc. */
  method?: string;
  url: string;
  headers?: SampleHeader[];
  /** Raw JSON body string (HTTP POST samples only). */
  body?: string;
  /** GraphQL query body (kind === "graphql" only). */
  gqlQuery?: string;
};

export const SAMPLES: readonly Sample[] = [
  {
    id: "sample-http-get",
    kind: "http",
    nameKey: "samples.httpGet.name",
    descriptionKey: "samples.httpGet.description",
    method: "GET",
    url: "https://httpbin.org/get?api-lab=hello",
  },
  {
    id: "sample-http-post",
    kind: "http",
    nameKey: "samples.httpPost.name",
    descriptionKey: "samples.httpPost.description",
    method: "POST",
    url: "https://postman-echo.com/post",
    headers: [{ k: "Content-Type", v: "application/json" }],
    body: '{\n  "from": "api-lab",\n  "hello": "world"\n}',
  },
  {
    id: "sample-graphql-countries",
    kind: "graphql",
    nameKey: "samples.graphql.name",
    descriptionKey: "samples.graphql.description",
    method: "POST",
    url: "https://countries.trevorblades.com/",
    gqlQuery:
      "query Countries {\n  countries {\n    code\n    name\n    emoji\n    capital\n  }\n}",
  },
  {
    id: "sample-ws-echo",
    kind: "ws",
    nameKey: "samples.ws.name",
    descriptionKey: "samples.ws.description",
    url: "wss://ws.postman-echo.com/raw",
  },
  {
    id: "sample-sse-test",
    kind: "sse",
    nameKey: "samples.sse.name",
    descriptionKey: "samples.sse.description",
    url: "https://sse.dev/test",
  },
  {
    id: "sample-grpc-reflection",
    kind: "grpc",
    nameKey: "samples.grpc.name",
    descriptionKey: "samples.grpc.description",
    url: "grpcb.in:9000",
  },
] as const;

/** Find a sample by id. Returns undefined if the id doesn't match —
    callers should treat that as "the user's hidden-state references a
    sample id that was renamed or removed; ignore." */
export function findSample(id: string): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}

/** Match a query string against sample names + descriptions for
    QuickSwitcher. Case-insensitive substring match on the i18n keys'
    `last segment` (so "ws echo" matches sample-ws-echo). The QuickSwitcher
    container is responsible for translating keys → display strings;
    this function works on the structural keys only so it stays pure. */
export function matchSamplesByQuery(query: string): readonly Sample[] {
  const q = query.trim().toLowerCase();
  if (!q) return SAMPLES;
  return SAMPLES.filter((s) => {
    const haystack = [s.id, s.kind, s.nameKey, s.descriptionKey].join(" ").toLowerCase();
    return q.split(/\s+/).every((tok) => haystack.includes(tok));
  });
}
