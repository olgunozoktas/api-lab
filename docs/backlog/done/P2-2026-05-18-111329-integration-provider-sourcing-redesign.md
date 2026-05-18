# Integration provider sourcing — redesign around the bridge cap + endpoint volume

Priority: P2

## Context

Follow-up to `docs/backlog/P2-2026-05-18-081623-integrations-gallery-provider-collections.md`.
The integrations framework (registry + gallery modal + fetch/import
pipeline + auth scaffolding — items 1-3) shipped 2026-05-18. But the
two headline providers can't actually load, and the build of the
framework surfaced *why* — two hard problems with "auto-fetch the
provider's full OpenAPI spec":

1. **Spec size.** Cloudflare's `openapi.json` is ~9.9 MB and Stripe's
   `spec3.json` is ~7.8 MB. The Zig bridge's `http.request` result
   buffer caps near 1 MB (`src/handlers/http.zig`), so neither spec
   survives the round-trip — the gallery shows a "spec too large"
   error.
2. **Endpoint volume.** Even fetched, a full provider spec imports
   1000+ endpoints in a single collection dump — unusable as a
   day-one surface (the parent file's own AWS note, "do not attempt
   all of AWS", is the same warning).

This item picks a sourcing strategy and makes Cloudflare + Stripe
(parent items #4/#5) actually work.

## Items

- [x] **Pick the sourcing approach.** Evaluate the three candidates
      and commit to one (or a hybrid):
      - *Curated subsets* — small, hand-picked endpoint sets per
        provider (e.g. "Stripe — Payments essentials", ~15 endpoints),
        shipped as small bundled/fetched JSON. Sidesteps both problems;
        changes what a "provider integration" is.
      - *Raised bridge buffer* — bump `http.request`'s result buffer
        ~1 MB → ~16 MB. Core-bridge change affecting every command;
        still leaves the 1000-endpoint dump.
      - *Fetch-to-file* — a new bridge command that streams a large
        response to a temp file (uses the declared-but-unused
        `filesystem` permission); the frontend reads + parses it.
- [x] **Implement provider sourcing** for Cloudflare + Stripe via the
      chosen approach; flip parent items #4/#5 to done.
- [x] **Remove-on-disable** — track an integration→wrapper-folder-id
      map (deferred from the parent's item 2) so disabling an
      integration removes its imported collection.
- [x] **Visually-distinct integration group** — a badge or section so
      imported integration collections read differently from the
      user's own collections.

## Acceptance

Enabling Cloudflare or Stripe from the gallery lands a usable, sanely
sized collection with auth pre-scaffolded; disabling removes it; the
import never errors on spec size.

## Tradeoffs & risks

The curated-subset approach is the most user-friendly and avoids both
technical walls, but means maintaining hand-picked endpoint sets.
Raising the bridge buffer is a core-contract change with memory
implications and doesn't solve endpoint volume. Fetch-to-file is the
most general but the largest build.

## How to work on this

Start with the approach decision — it gates everything else. If
curated subsets win, the registry's `fetch` descriptor grows a
`curated` kind (already anticipated in `IntegrationFetchSpec`). Reuse
the shipped `lib/integrations/` framework — `registry.ts`, `fetch.ts`,
`auth.ts` and the gallery components are all in place; this item only
changes how spec data is sourced. Build `./build.sh`; tests
`cd frontend && dnpm run test`.
