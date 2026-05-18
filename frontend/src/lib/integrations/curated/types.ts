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
};

export type CuratedProvider = {
  // Absolute API base; each endpoint's `path` is appended to it.
  baseUrl: string;
  endpoints: CuratedEndpoint[];
};
