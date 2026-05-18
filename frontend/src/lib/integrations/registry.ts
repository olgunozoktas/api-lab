/** Olgun Özoktaş geliştirdi · API Lab */
import type { AuthType } from "../types";

// How an integration's API surface is sourced. `openapi-url` fetches a
// published OpenAPI 3.x document and runs it through the OpenAPI
// importer. (Other source kinds — curated subsets, MCP — are tracked
// as follow-up work; see the integrations backlog file.)
export type IntegrationFetchSpec = { kind: "openapi-url"; specUrl: string };

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
}

// The curated registry. Opt-in: nothing here is loaded until the user
// enables it from the integrations gallery.
export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "Infrastructure",
    description: "Cloudflare's REST API — DNS, Workers, zones, R2 and more.",
    homepage: "https://developers.cloudflare.com/api/",
    fetch: {
      kind: "openapi-url",
      specUrl: "https://raw.githubusercontent.com/cloudflare/api-schemas/main/openapi.json",
    },
    authType: "bearer",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Stripe's API — payments, customers, subscriptions, invoices.",
    homepage: "https://stripe.com/docs/api",
    fetch: {
      kind: "openapi-url",
      specUrl: "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json",
    },
    authType: "bearer",
  },
];

export function findIntegration(id: string): IntegrationDef | undefined {
  return INTEGRATIONS.find((entry) => entry.id === id);
}
