/** Olgun Özoktaş geliştirdi · API Lab */
// Slack — curated essentials. A hand-picked slice of the Web API:
// messaging, conversations, users, files, reactions, auth. Slack's
// Web API is RPC-style — each method is its own endpoint. Write
// methods accept a JSON body (with `Content-Type: application/json`).
import type { CuratedProvider } from "./types";

export const slackCurated: CuratedProvider = {
  baseUrl: "https://slack.com/api",
  endpoints: [
    {
      group: "Messages",
      name: "Post a message",
      method: "POST",
      path: "/chat.postMessage",
      description: "Send a message to a channel.",
      body: {
        mode: "json",
        text: '{\n  "channel": "C0123456789",\n  "text": "Hello from API Lab"\n}',
      },
    },
    {
      group: "Messages",
      name: "Update a message",
      method: "POST",
      path: "/chat.update",
      description: "Edit an existing message (by channel + timestamp).",
      body: {
        mode: "json",
        text: '{\n  "channel": "C0123456789",\n  "ts": "1234567890.123456",\n  "text": "Updated text"\n}',
      },
    },
    {
      group: "Messages",
      name: "Delete a message",
      method: "POST",
      path: "/chat.delete",
      description: "Delete a message (by channel + timestamp).",
      body: {
        mode: "json",
        text: '{\n  "channel": "C0123456789",\n  "ts": "1234567890.123456"\n}',
      },
    },
    {
      group: "Conversations",
      name: "List conversations",
      method: "GET",
      path: "/conversations.list",
      description: "List channels in the workspace.",
    },
    {
      group: "Conversations",
      name: "Create a channel",
      method: "POST",
      path: "/conversations.create",
      description: "Create a public or private channel.",
      body: {
        mode: "json",
        text: '{\n  "name": "my-channel",\n  "is_private": false\n}',
      },
    },
    {
      group: "Conversations",
      name: "Conversation history",
      method: "GET",
      path: "/conversations.history",
      description: "Fetch a channel's recent messages.",
    },
    {
      group: "Conversations",
      name: "Conversation info",
      method: "GET",
      path: "/conversations.info",
      description: "Fetch metadata for a single channel.",
    },
    {
      group: "Users",
      name: "List users",
      method: "GET",
      path: "/users.list",
      description: "List members of the workspace.",
    },
    {
      group: "Users",
      name: "User info",
      method: "GET",
      path: "/users.info",
      description: "Fetch a single user's profile.",
    },
    {
      group: "Files",
      name: "List files",
      method: "GET",
      path: "/files.list",
      description: "List files shared in the workspace.",
    },
    {
      group: "Reactions",
      name: "Add a reaction",
      method: "POST",
      path: "/reactions.add",
      description: "Add an emoji reaction to a message.",
      body: {
        mode: "json",
        text: '{\n  "channel": "C0123456789",\n  "timestamp": "1234567890.123456",\n  "name": "thumbsup"\n}',
      },
    },
    {
      group: "Auth",
      name: "Test auth",
      method: "GET",
      path: "/auth.test",
      description: "Verify the token and see which workspace it belongs to.",
    },
  ],
};
