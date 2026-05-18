/** Olgun Özoktaş geliştirdi · API Lab */
// Linear — curated essentials. Linear's API is GraphQL-only: a single
// endpoint that takes a query in the body. The imported request opens
// in the composer's GraphQL tab, pre-seeded with a starter query so
// it's runnable immediately — edit it toward issues, teams, projects.
import type { CuratedProvider } from "./types";

export const linearCurated: CuratedProvider = {
  baseUrl: "https://api.linear.app/graphql",
  endpoints: [
    {
      name: "GraphQL endpoint",
      method: "POST",
      path: "",
      graphql: true,
      description: "Linear's single GraphQL endpoint — starter query: the current viewer.",
      graphqlQuery: "query {\n  viewer {\n    id\n    name\n    email\n  }\n}",
    },
  ],
};
