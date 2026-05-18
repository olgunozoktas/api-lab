/** Olgun Özoktaş geliştirdi · API Lab */
// Cloudflare — curated essentials. A hand-picked slice of the v4 REST
// API (the full `openapi.json` is ~9.9 MB / 1000+ operations). Covers
// the everyday surfaces: zones, DNS records, Workers, account, R2.
import type { CuratedProvider } from "./types";

export const cloudflareCurated: CuratedProvider = {
  baseUrl: "https://api.cloudflare.com/client/v4",
  endpoints: [
    { group: "Zones", name: "List zones", method: "GET", path: "/zones" },
    { group: "Zones", name: "Zone details", method: "GET", path: "/zones/{zone_id}" },
    { group: "Zones", name: "Create zone", method: "POST", path: "/zones" },
    { group: "Zones", name: "Delete zone", method: "DELETE", path: "/zones/{zone_id}" },
    {
      group: "DNS",
      name: "List DNS records",
      method: "GET",
      path: "/zones/{zone_id}/dns_records",
    },
    {
      group: "DNS",
      name: "Create DNS record",
      method: "POST",
      path: "/zones/{zone_id}/dns_records",
    },
    {
      group: "DNS",
      name: "Update DNS record",
      method: "PUT",
      path: "/zones/{zone_id}/dns_records/{dns_record_id}",
    },
    {
      group: "DNS",
      name: "Delete DNS record",
      method: "DELETE",
      path: "/zones/{zone_id}/dns_records/{dns_record_id}",
    },
    {
      group: "Workers",
      name: "List Worker scripts",
      method: "GET",
      path: "/accounts/{account_id}/workers/scripts",
    },
    {
      group: "Workers",
      name: "Upload Worker script",
      method: "PUT",
      path: "/accounts/{account_id}/workers/scripts/{script_name}",
    },
    {
      group: "R2",
      name: "List R2 buckets",
      method: "GET",
      path: "/accounts/{account_id}/r2/buckets",
    },
    { group: "Account", name: "List accounts", method: "GET", path: "/accounts" },
    { group: "Account", name: "Verify API token", method: "GET", path: "/user/tokens/verify" },
  ],
};
