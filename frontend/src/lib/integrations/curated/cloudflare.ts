/** Olgun Özoktaş geliştirdi · API Lab */
// Cloudflare — curated essentials. A hand-picked slice of the v4 REST
// API (the full `openapi.json` is ~9.9 MB / 1000+ operations). Covers
// the everyday surfaces: zones, DNS records, Workers, account, R2.
// POST / PUT endpoints carry a minimal JSON body skeleton — Cloudflare
// is a JSON API.
import type { CuratedProvider } from "./types";

export const cloudflareCurated: CuratedProvider = {
  baseUrl: "https://api.cloudflare.com/client/v4",
  endpoints: [
    {
      group: "Zones",
      name: "List zones",
      method: "GET",
      path: "/zones",
      description: "List the zones (domains) on the account.",
    },
    {
      group: "Zones",
      name: "Zone details",
      method: "GET",
      path: "/zones/{zone_id}",
      description: "Fetch a single zone by its id.",
    },
    {
      group: "Zones",
      name: "Create zone",
      method: "POST",
      path: "/zones",
      description: "Add a new domain to the account.",
      body: {
        mode: "json",
        text: '{\n  "name": "example.com",\n  "account": { "id": "{account_id}" }\n}',
      },
    },
    {
      group: "Zones",
      name: "Delete zone",
      method: "DELETE",
      path: "/zones/{zone_id}",
      description: "Remove a zone from the account.",
    },
    {
      group: "DNS",
      name: "List DNS records",
      method: "GET",
      path: "/zones/{zone_id}/dns_records",
      description: "List a zone's DNS records.",
    },
    {
      group: "DNS",
      name: "Create DNS record",
      method: "POST",
      path: "/zones/{zone_id}/dns_records",
      description: "Add a DNS record to a zone.",
      body: {
        mode: "json",
        text: '{\n  "type": "A",\n  "name": "www",\n  "content": "192.0.2.1",\n  "ttl": 3600,\n  "proxied": false\n}',
      },
    },
    {
      group: "DNS",
      name: "Update DNS record",
      method: "PUT",
      path: "/zones/{zone_id}/dns_records/{dns_record_id}",
      description: "Overwrite an existing DNS record.",
      body: {
        mode: "json",
        text: '{\n  "type": "A",\n  "name": "www",\n  "content": "192.0.2.1",\n  "ttl": 3600,\n  "proxied": false\n}',
      },
    },
    {
      group: "DNS",
      name: "Delete DNS record",
      method: "DELETE",
      path: "/zones/{zone_id}/dns_records/{dns_record_id}",
      description: "Remove a DNS record from a zone.",
    },
    {
      group: "Workers",
      name: "List Worker scripts",
      method: "GET",
      path: "/accounts/{account_id}/workers/scripts",
      description: "List the account's deployed Worker scripts.",
    },
    {
      group: "Workers",
      name: "Upload Worker script",
      method: "PUT",
      path: "/accounts/{account_id}/workers/scripts/{script_name}",
      // No JSON skeleton — the body is the Worker's JavaScript source
      // (or a multipart bundle), not JSON.
      description: "Upload a Worker script — body is the JS source / multipart bundle.",
    },
    {
      group: "R2",
      name: "List R2 buckets",
      method: "GET",
      path: "/accounts/{account_id}/r2/buckets",
      description: "List the account's R2 storage buckets.",
    },
    {
      group: "Account",
      name: "List accounts",
      method: "GET",
      path: "/accounts",
      description: "List accounts the API token can access.",
    },
    {
      group: "Account",
      name: "Verify API token",
      method: "GET",
      path: "/user/tokens/verify",
      description: "Check that the current API token is valid.",
    },
  ],
};
