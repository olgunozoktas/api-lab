/** Olgun Özoktaş geliştirdi · API Lab */
// Curated provider sourcing. A curated provider is a small, hand-picked
// set of the most-used endpoints for an API — shipped as compact data,
// not a fetched OpenAPI document. This sidesteps both walls that block
// full-spec auto-fetch: the native bridge's ~1 MB result buffer, and
// the unusable 1000+-endpoint dump a full provider spec produces.

export type CuratedEndpoint = {
  // Human-facing request name, shown in the collection tree.
  name: string;
  method: string;
  // Path appended to the provider's `baseUrl`. Path parameters stay as
  // literal `{placeholder}` tokens the user edits after import.
  path: string;
  // Optional sub-folder name — endpoints sharing a group land together.
  group?: string;
  // When true, the imported request opens in GraphQL mode (the
  // composer's GraphQL tab). For GraphQL-only providers, whose single
  // endpoint takes a query in the body rather than a REST path.
  graphql?: boolean;
  // Optional starter GraphQL query — seeds `gql.query` on a `graphql`
  // endpoint so the GraphQL composer opens with a runnable example.
  graphqlQuery?: string;
  // Optional ready-to-edit request body skeleton (POST / PUT / PATCH).
  // `mode` must match the provider's content type — `json` for JSON
  // APIs, `form` for `application/x-www-form-urlencoded` (e.g. Stripe).
  // Ignored on `graphql` endpoints. Keep it to the 3-5 common fields.
  body?: { mode: "json" | "form" | "raw"; text: string };
  // Optional one-line description, surfaced as the request row's
  // hover tooltip in the collection tree.
  description?: string;
};

export type CuratedProvider = {
  // Absolute API base; each endpoint's `path` is appended to it.
  baseUrl: string;
  endpoints: CuratedEndpoint[];
};
