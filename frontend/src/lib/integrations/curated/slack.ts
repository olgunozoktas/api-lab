/** Olgun Özoktaş geliştirdi · API Lab */
// Slack — curated essentials. A hand-picked slice of the Web API:
// messaging, conversations, users, files, reactions, auth. Slack's
// Web API is RPC-style — each method is its own endpoint.
import type { CuratedProvider } from "./types";

export const slackCurated: CuratedProvider = {
  baseUrl: "https://slack.com/api",
  endpoints: [
    { group: "Messages", name: "Post a message", method: "POST", path: "/chat.postMessage" },
    { group: "Messages", name: "Update a message", method: "POST", path: "/chat.update" },
    { group: "Messages", name: "Delete a message", method: "POST", path: "/chat.delete" },
    {
      group: "Conversations",
      name: "List conversations",
      method: "GET",
      path: "/conversations.list",
    },
    {
      group: "Conversations",
      name: "Create a channel",
      method: "POST",
      path: "/conversations.create",
    },
    {
      group: "Conversations",
      name: "Conversation history",
      method: "GET",
      path: "/conversations.history",
    },
    {
      group: "Conversations",
      name: "Conversation info",
      method: "GET",
      path: "/conversations.info",
    },
    { group: "Users", name: "List users", method: "GET", path: "/users.list" },
    { group: "Users", name: "User info", method: "GET", path: "/users.info" },
    { group: "Files", name: "List files", method: "GET", path: "/files.list" },
    { group: "Reactions", name: "Add a reaction", method: "POST", path: "/reactions.add" },
    { group: "Auth", name: "Test auth", method: "GET", path: "/auth.test" },
  ],
};
