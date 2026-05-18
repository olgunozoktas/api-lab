/** Olgun Özoktaş geliştirdi · API Lab */
// Linear — curated essentials. Linear's API is GraphQL-only: a single
// endpoint that takes a query in the body. The imported request opens
// in the composer's GraphQL tab, ready for you to write queries
// (issues, teams, projects, …) against the schema.
import type { CuratedProvider } from "./types";

export const linearCurated: CuratedProvider = {
  baseUrl: "https://api.linear.app/graphql",
  endpoints: [{ name: "GraphQL endpoint", method: "POST", path: "", graphql: true }],
};
