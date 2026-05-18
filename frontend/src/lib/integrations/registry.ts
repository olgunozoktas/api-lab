/** Olgun Özoktaş geliştirdi · API Lab */
import type { AuthType } from "../types";
import type { CuratedProvider } from "./curated/types";
import { cloudflareCurated } from "./curated/cloudflare";
import { stripeCurated } from "./curated/stripe";

// How an integration's API surface is sourced.
//
// - `curated` — a small, hand-picked endpoint set shipped as compact
//   data. Sidesteps the native bridge's ~1 MB result buffer and the
//   unusable 1000+-endpoint dump a full provider spec produces. This
//   is the default for the gallery's providers.
// - `openapi-url` — fetches a published OpenAPI 3.x document and runs
//   it through the OpenAPI importer. Kept for small specs / future
//   providers; large specs fail on the bridge buffer.
export type IntegrationFetchSpec =
  | { kind: "curated"; provider: CuratedProvider }
  | { kind: "openapi-url"; specUrl: string };

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
];

export function findIntegration(id: string): IntegrationDef | undefined {
  return INTEGRATIONS.find((entry) => entry.id === id);
}
