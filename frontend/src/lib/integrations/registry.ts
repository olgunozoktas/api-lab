/** Olgun Özoktaş geliştirdi · API Lab */
import type { AuthType, McpTransport } from "../types";
import type { AuthHints } from "./auth";
import type { CuratedProvider } from "./curated/types";
import { cloudflareCurated } from "./curated/cloudflare";
import { stripeCurated } from "./curated/stripe";
import { githubCurated } from "./curated/github";
import { openaiCurated } from "./curated/openai";
import { slackCurated } from "./curated/slack";
import { notionCurated } from "./curated/notion";
import { linearCurated } from "./curated/linear";
import { awsS3Curated } from "./curated/aws-s3";
import { awsLambdaCurated } from "./curated/aws-lambda";

// How an integration's API surface is sourced.
//
// - `curated` — a small, hand-picked endpoint set shipped as compact
//   data. Sidesteps the native bridge's ~1 MB result buffer and the
//   unusable 1000+-endpoint dump a full provider spec produces. This
//   is the default for the gallery's providers.
// - `openapi-url` — fetches a published OpenAPI 3.x document and runs
//   it through the OpenAPI importer. Kept for small specs / future
//   providers; large specs fail on the bridge buffer.
// - `mcp` — installs a Model Context Protocol server into the MCP
//   servers library (`store/mcpServers`). Doesn't import a
//   collection — the user reaches the server from an MCP request
//   tab. The library row shows an "Integration" badge and is
//   read-only (Edit/Delete locked); removal happens by disabling
//   the integration here.
export type IntegrationFetchSpec =
  | { kind: "curated"; provider: CuratedProvider }
  | { kind: "openapi-url"; specUrl: string }
  | { kind: "mcp"; transport: McpTransport };

// One curated integration in the gallery. Pure data — no behaviour.
export interface IntegrationDef {
  id: string;
  name: string;
  category: string;
  description: string;
  // Provider docs/homepage — surfaced as a link on the gallery card.
  homepage: string;
  fetch: IntegrationFetchSpec;
  // Auth shape pre-scaffolded onto every imported request — the user
  // supplies only the secret.
  authType: AuthType;
  // Optional auth-scaffolding hints (e.g. AWS S3 sets
  // `sigv4Service: "s3"` so the user doesn't have to type it on
  // every imported request).
  authHints?: AuthHints;
}

// The curated registry. Opt-in: nothing here is loaded until the user
// enables it from the integrations gallery.
export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "Infrastructure",
    description: "Cloudflare's REST API — zones, DNS, Workers, R2. Curated essentials.",
    homepage: "https://developers.cloudflare.com/api/",
    fetch: { kind: "curated", provider: cloudflareCurated },
    authType: "bearer",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Stripe's API — payments, customers, subscriptions, invoices. Curated essentials.",
    homepage: "https://stripe.com/docs/api",
    fetch: { kind: "curated", provider: stripeCurated },
    authType: "bearer",
  },
  {
    id: "github",
    name: "GitHub",
    category: "Developer",
    description: "GitHub's REST API — repos, issues, pull requests, actions. Curated essentials.",
    homepage: "https://docs.github.com/en/rest",
    fetch: { kind: "curated", provider: githubCurated },
    authType: "bearer",
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "AI",
    description: "OpenAI's API — chat, models, embeddings, images, audio. Curated essentials.",
    homepage: "https://platform.openai.com/docs/api-reference",
    fetch: { kind: "curated", provider: openaiCurated },
    authType: "bearer",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    description: "Slack's Web API — messages, channels, users, files. Curated essentials.",
    homepage: "https://api.slack.com/web",
    fetch: { kind: "curated", provider: slackCurated },
    authType: "bearer",
  },
  {
    id: "notion",
    name: "Notion",
    category: "Productivity",
    description: "Notion's API — pages, databases, blocks, search. Curated essentials.",
    homepage: "https://developers.notion.com/reference",
    fetch: { kind: "curated", provider: notionCurated },
    authType: "bearer",
  },
  {
    id: "linear",
    name: "Linear",
    category: "Productivity",
    description: "Linear's GraphQL API — one endpoint, opens ready in the GraphQL composer.",
    homepage: "https://developers.linear.app/docs",
    fetch: { kind: "curated", provider: linearCurated },
    authType: "bearer",
  },
  {
    id: "aws-s3",
    name: "AWS S3",
    category: "Cloud",
    description:
      "AWS S3 REST API — list buckets, list objects, get / put / delete object. Curated essentials, signed with SigV4.",
    homepage: "https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html",
    fetch: { kind: "curated", provider: awsS3Curated },
    authType: "aws-sigv4",
    authHints: { sigv4Service: "s3" },
  },
  {
    id: "aws-lambda",
    name: "AWS Lambda",
    category: "Cloud",
    description:
      "AWS Lambda REST API — list / get / invoke / list-aliases. Curated essentials, signed with SigV4.",
    homepage: "https://docs.aws.amazon.com/lambda/latest/api/welcome.html",
    fetch: { kind: "curated", provider: awsLambdaCurated },
    authType: "aws-sigv4",
    authHints: { sigv4Service: "lambda" },
  },
  {
    id: "findutils",
    name: "findutils",
    category: "MCP",
    description:
      "MCP server for findutils.com — search and code tools an LLM can call directly. Enable to install into your MCP servers library.",
    homepage: "https://findutils.com",
    fetch: { kind: "mcp", transport: { kind: "http", url: "https://mcp.findutils.com" } },
    authType: "none",
  },
];

export function findIntegration(id: string): IntegrationDef | undefined {
  return INTEGRATIONS.find((entry) => entry.id === id);
}
