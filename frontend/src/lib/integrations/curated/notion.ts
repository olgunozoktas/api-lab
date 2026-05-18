/** Olgun Özoktaş geliştirdi · API Lab */
// Notion — curated essentials. A hand-picked slice of the API: pages,
// databases, blocks, search, users. Notion also requires a
// `Notion-Version` header — add it once in the request's Headers tab.
// Write endpoints carry a minimal JSON body skeleton.
import type { CuratedProvider } from "./types";

export const notionCurated: CuratedProvider = {
  baseUrl: "https://api.notion.com/v1",
  endpoints: [
    {
      group: "Pages",
      name: "Retrieve a page",
      method: "GET",
      path: "/pages/{page_id}",
      description: "Fetch a page's properties.",
    },
    {
      group: "Pages",
      name: "Create a page",
      method: "POST",
      path: "/pages",
      description: "Create a page inside a database or another page.",
      body: {
        mode: "json",
        text: '{\n  "parent": { "database_id": "{database_id}" },\n  "properties": {\n    "Name": { "title": [{ "text": { "content": "New page" } }] }\n  }\n}',
      },
    },
    {
      group: "Pages",
      name: "Update page properties",
      method: "PATCH",
      path: "/pages/{page_id}",
      description: "Update a page's property values.",
      body: {
        mode: "json",
        text: '{\n  "properties": {}\n}',
      },
    },
    {
      group: "Databases",
      name: "Query a database",
      method: "POST",
      path: "/databases/{database_id}/query",
      description: "Query a database's rows, with optional filter + sorts.",
      body: {
        mode: "json",
        text: '{\n  "page_size": 100\n}',
      },
    },
    {
      group: "Databases",
      name: "Retrieve a database",
      method: "GET",
      path: "/databases/{database_id}",
      description: "Fetch a database's schema.",
    },
    {
      group: "Databases",
      name: "Create a database",
      method: "POST",
      path: "/databases",
      description: "Create a database under a parent page.",
      body: {
        mode: "json",
        text: '{\n  "parent": { "page_id": "{page_id}" },\n  "title": [{ "text": { "content": "New database" } }],\n  "properties": { "Name": { "title": {} } }\n}',
      },
    },
    {
      group: "Blocks",
      name: "Retrieve block children",
      method: "GET",
      path: "/blocks/{block_id}/children",
      description: "List the child blocks of a page or block.",
    },
    {
      group: "Blocks",
      name: "Append block children",
      method: "PATCH",
      path: "/blocks/{block_id}/children",
      description: "Append content blocks to a page or block.",
      body: {
        mode: "json",
        text: '{\n  "children": [\n    {\n      "type": "paragraph",\n      "paragraph": { "rich_text": [{ "text": { "content": "Hello" } }] }\n    }\n  ]\n}',
      },
    },
    {
      group: "Search",
      name: "Search",
      method: "POST",
      path: "/search",
      description: "Search pages and databases the integration can access.",
      body: {
        mode: "json",
        text: '{\n  "query": "",\n  "page_size": 100\n}',
      },
    },
    {
      group: "Users",
      name: "List users",
      method: "GET",
      path: "/users",
      description: "List users in the workspace.",
    },
    {
      group: "Users",
      name: "Retrieve your bot user",
      method: "GET",
      path: "/users/me",
      description: "Fetch the bot user the token authenticates as.",
    },
  ],
};
