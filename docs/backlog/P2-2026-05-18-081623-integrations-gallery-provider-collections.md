# API integrations gallery — opt-in provider collections + MCP panel

GitHub Issue: [#36](https://github.com/olgunozoktas/api-lab/issues/36)

Priority: P2

## Context

API Lab is a Postman-style API tester. Today it has Collections (the
user's saved request tree), a built-in Samples surface
(`store/samples.ts` + `lib/samples.ts` — hideable example requests),
and a shipped OpenAPI importer (`docs/backlog/done/P2-2026-05-09-171300-openapi-spec-import.md`,
`frontend/src/lib/importers/openapi`).

To test against a real provider — Cloudflare, Stripe, AWS — a user
must currently hunt down that provider's OpenAPI spec and import it by
hand. An **integrations gallery** makes it one click: the user opens a
gallery, picks a provider, and API Lab auto-fetches that provider's
published API surface and lands a ready-to-use collection with auth
pre-scaffolded.

Hard product constraint from the request: the integrations are **not
shown by default**. The gallery is a deliberate surface the user opens;
they enable only the integrations they want, and each enabled one
fetches + shows its APIs. Mirrors the Samples surface pattern
(built-in content that's opt-in / hideable), not an always-on panel.

`findutils.com` (the author's product) runs both an HTTP API and an
**MCP server**. API Lab does not speak MCP yet — so a new MCP protocol
panel (a surface alongside the existing HTTP / WS / SSE / gRPC /
GraphQL panels) is part of this initiative, so the findutils MCP
integration has something to connect through.

Related backlog: `P2-2026-05-09-171000-cookies-proxy-sigv4-mtls.md`
(SigV4 request signing — the AWS integration depends on it);
`P3-2026-05-09-172600-exporters-postman-openapi-bruno.md` (the inverse
direction — export, not import).

## Items

- [x] **Integrations registry + gallery modal** — a curated registry
      and an opt-in browse surface.
      → shipped: `lib/integrations/registry.ts` (`IntegrationDef` +
        `INTEGRATIONS` + `findIntegration`), `components/IntegrationsModal.tsx`
        + `components/IntegrationCard.tsx`, `store/integrations.ts`
        (`enabledIntegrations: string[]`, persisted), TopBar `Plug`
        button. Command palette has no generic entry registry — TopBar
        button is the entry point.
      - What it does: ships a curated `lib/integrations/registry.ts`
        (each entry: `id`, `name`, `category`, `description`, icon,
        `authType`, `fetch` descriptor — `openapi-url` | `mcp` |
        `curated`). An `<IntegrationsModal>` lists integrations as
        cards with an enable/disable toggle. NOT auto-shown — opened
        from a new TopBar button + the command palette.
      - Touchpoints: `frontend/src/lib/integrations/registry.ts` (new),
        `components/IntegrationsModal.tsx` (new — extract card/row
        subcomponents to stay under 400 LOC), `store/integrations.ts`
        (new slice — `enabledIntegrations: string[]`, persisted via
        `partialize` in `store/index.ts`), `components/TopBar.tsx`
        (entry button), command-palette entry if present.
      - Tests: `lib/integrations/__tests__/registry.test.ts` — registry
        shape validation, lookup-by-id, no duplicate ids.
      - Ship-it-fully: TopBar button + palette entry both reach the
        modal; every label via `t()` (i18n keys in `tr.ts`/`en.ts`).

- [x] **Auto-fetch + OpenAPI import pipeline** — turn an enabled
      integration into a live collection.
      → shipped: `lib/integrations/fetch.ts` — `fetchIntegrationSpec`
        (bridge fetch) + pure `parseIntegrationSpec`; reuses the
        OpenAPI importer + `importItems`. Every failure mode is an
        explicit discriminated result (bridge-unavailable / fetch-failed
        / too-large / parse-failed), surfaced via the #30 toast system.
        **Deferred**: remove-on-disable (needs an integration→folder-id
        map — coupled to the provider-sourcing redesign follow-up).
      - What it does: on enable, fetch the provider's OpenAPI spec via
        the `http.request` bridge (CORS-free curl) and run it through
        the existing `lib/importers/openapi`, landing requests under a
        dedicated, visually-distinct "Integrations" collection group.
        On disable, remove that integration's imported items. Provide
        a re-fetch/refresh action.
      - Touchpoints: `lib/integrations/fetch.ts` (new), reuse
        `lib/importers/openapi` + `lib/bridge.ts` `http.request`,
        `store/collections.ts` (import into a tagged group),
        `store/integrations.ts`.
      - Tests: `lib/integrations/__tests__/fetch.test.ts` — pipeline
        with a fixture spec; fetch-failure path; disable-removes-items.
      - Ship-it-fully: loading / ready / error / empty states in the
        modal; success + failure surfaced via the toast severity
        system (`lib/toast.ts`, shipped in #30).

- [x] **Per-integration auth scaffolding** — imported requests arrive
      auth-ready.
      → shipped: `lib/integrations/auth.ts` — `scaffoldAuth(authType)`
        builds the placeholder `Auth` shape (bearer / apikey / basic /
        aws-sigv4); `applyAuthToItems` stamps it onto every request
        node of an imported tree. The pipeline applies it before import.
      - What it does: each integration's imported requests carry the
        right auth shape pre-wired with placeholder values — Cloudflare
        (Bearer API token), Stripe (Bearer secret key), AWS (SigV4),
        findutils (API-key header). The user supplies only the secret,
        once, per integration.
      - Touchpoints: `lib/integrations/auth.ts` (new), the request
        `auth` shape, `store/env.ts` or a per-integration credential
        slot.
      - Tests: auth-scaffold mapping per provider.
      - Ship-it-fully: a credential field on each gallery card; secrets
        never logged or committed (project secrets policy).

- [x] **Cloudflare integration definition** — registry entry pointing
      at Cloudflare's published OpenAPI spec; auth = Bearer API token.

- [x] **Stripe integration definition** — registry entry pointing at
      Stripe's published OpenAPI spec; auth = Bearer secret key.

- [ ] **AWS integration definition** — registry entries for ~3-5
      popular services (e.g. S3, Lambda, EC2, DynamoDB, SQS); auth =
      SigV4 (depends on `P2-2026-05-09-171000-cookies-proxy-sigv4-mtls`).
      AWS ships no single OpenAPI document — use per-service curated
      definitions; do NOT attempt all of AWS.

- [ ] **findutils.com integration definition** — the author's product:
      its HTTP/REST API surfaced as a collection (spec URL or curated
      definition). The MCP half is covered by the next item.

- [x] **MCP protocol panel** — a new protocol surface for connecting
      to MCP servers (the heaviest item).
      → shipped 2026-05-19 (v0.15.0) via the #37 ship that absorbed
        this item's scope: `lib/mcp.ts` (JSON-RPC framing, response
        parsing, stdio + HTTP transports, `mcpListTools`/`mcpCallTool`)
        and `<McpPanel>` reached from a new TopBar "MCP servers"
        button. The stdio transport — originally scoped out as "MCP
        stdio cannot run inside the sandboxed WebView" — landed via
        the `mcp.stdio` Zig bridge command (`src/handlers/mcp.zig`),
        the same pattern `http.request` uses for CORS-free curl.

## Acceptance

- The integrations gallery is reachable from the TopBar and the
  command palette, and is never shown unless the user opens it.
- A user can enable an integration; its API surface auto-fetches and
  appears as a dedicated, visually-distinct collection group.
- Disabling an integration removes its imported collection and leaves
  the user's own collections untouched.
- Each integration's requests carry pre-scaffolded auth with
  placeholders; the user supplies only the secret.
- Cloudflare, Stripe, AWS (3-5 services), and findutils integrations
  are all selectable.
- API Lab can connect to an MCP server, list its tools, and invoke one.
- A fetch failure surfaces an error toast and never corrupts existing
  user collections.

## Tradeoffs & risks

- Large initiative — 8 items. The MCP protocol panel is the heaviest
  and is effectively its own ship slice; `/backlog-ship` should slice
  this file rather than ship it monolithically.
- AWS has no single OpenAPI spec — per-service curated definitions.
  Scope-creep risk if "all of AWS" is attempted; bound to ~3-5 services.
- Provider spec URLs and shapes drift over time — auto-fetch must fail
  gracefully and version-pin specs where possible.
- MCP stdio transport cannot run inside the sandboxed WebView — only
  HTTP/SSE MCP transports are in scope here. A Zig bridge sidecar for
  stdio MCP would be a separate item.
- Integration credentials are real user API keys — they follow the
  project secrets policy (never committed, never logged; stored in
  `localStorage` like other persisted state).
- Bundle size: provider specs can be large — they are fetched + parsed
  at runtime, never bundled; the OpenAPI importer is already
  lazy-loaded, so the main bundle is unaffected.

## How to work on this

Ship the framework first as the foundation: Item 1 (registry +
gallery), Item 2 (auto-fetch + import pipeline), Item 3 (auth
scaffolding). Then add providers one per slice — Cloudflare → Stripe →
findutils (HTTP) → AWS (AWS last, it depends on the SigV4 backlog
item). The MCP protocol panel (Item 8) is independent and the largest
single piece — treat it as its own ship slice; it unblocks the full
findutils MCP integration. Reuse the shipped OpenAPI importer
(`frontend/src/lib/importers/openapi`), the `http.request` bridge for
CORS-free fetches, the toast severity system (`lib/toast.ts`) for fetch
feedback, and mirror `WsPanel` / `SsePanel` / `GrpcPanel` for the MCP
panel. Keep every component under the 400-LOC cap — extract gallery
cards / integration rows / MCP sub-panels. Build with `./build.sh`;
tests `cd frontend && dnpm run test`; typecheck
`dnpm isolated npx tsc --noEmit`. Backlog file:
`docs/backlog/P2-2026-05-18-081623-integrations-gallery-provider-collections.md`.

## Follow-ups

Items 1-3 (framework), #4 Cloudflare, #5 Stripe, and #8 MCP panel are
all shipped. This file stays live only for the two remaining items:

- **#4 Cloudflare / #5 Stripe** — now genuinely usable. The gallery
  was redesigned (2026-05-18) from live-OpenAPI fetch to **curated
  bundled subsets**, so the 8-10 MB spec problem is moot. Both
  providers ship as hand-curated subsets with body skeletons and
  endpoint descriptions; the curated framework (`lib/integrations/curated/`)
  also covers GitHub / OpenAI / Slack / Notion / Linear. Resolved.
- **#6 AWS** — still blocked on
  `P2-2026-05-09-171000-cookies-proxy-sigv4-mtls` (SigV4 request
  signing). AWS requests can't authenticate without it.
- **#7 findutils** — needs the real findutils.com OpenAPI spec /
  endpoint shape, not yet supplied by the project owner.
- **#8 MCP protocol panel** — shipped 2026-05-19 (v0.15.0). The
  `mcp.stdio` Zig bridge command landed too, so stdio MCP servers
  are reachable from the WebView. Closed #37. See the archived ship
  `done/P3-2026-05-18-081829-mcp-stdio-transport-zig-sidecar.md`.
