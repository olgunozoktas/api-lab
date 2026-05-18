/** Olgun Özoktaş geliştirdi · API Lab */
// Notion — curated essentials. A hand-picked slice of the API: pages,
// databases, blocks, search, users. Notion also requires a
// `Notion-Version` header — add it once in the request's Headers tab.
import type { CuratedProvider } from "./types";

export const notionCurated: CuratedProvider = {
  baseUrl: "https://api.notion.com/v1",
  endpoints: [
    { group: "Pages", name: "Retrieve a page", method: "GET", path: "/pages/{page_id}" },
    { group: "Pages", name: "Create a page", method: "POST", path: "/pages" },
    { group: "Pages", name: "Update page properties", method: "PATCH", path: "/pages/{page_id}" },
    {
      group: "Databases",
      name: "Query a database",
      method: "POST",
      path: "/databases/{database_id}/query",
    },
    {
      group: "Databases",
      name: "Retrieve a database",
      method: "GET",
      path: "/databases/{database_id}",
    },
    { group: "Databases", name: "Create a database", method: "POST", path: "/databases" },
    {
      group: "Blocks",
      name: "Retrieve block children",
      method: "GET",
      path: "/blocks/{block_id}/children",
    },
    {
      group: "Blocks",
      name: "Append block children",
      method: "PATCH",
      path: "/blocks/{block_id}/children",
    },
    { group: "Search", name: "Search", method: "POST", path: "/search" },
    { group: "Users", name: "List users", method: "GET", path: "/users" },
    { group: "Users", name: "Retrieve your bot user", method: "GET", path: "/users/me" },
  ],
};
