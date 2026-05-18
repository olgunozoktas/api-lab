# Curated integration endpoints — request-body skeletons + descriptions

Priority: P3

## Context

Follow-up to `docs/backlog/done/P2-2026-05-18-111329-integration-provider-sourcing-redesign.md`
(shipped 2026-05-18). The curated-sourcing redesign made Cloudflare +
Stripe load as compact, hand-picked collections. But a `CuratedEndpoint`
today is only `name + method + path + group` — so every imported POST /
PUT request arrives with an empty body. A user enabling Stripe still
has to hand-build the JSON for "Create customer", "Create payment
intent", etc. from the provider's docs.

The Step 8 ultrathink (both CEO and Eng lenses) flagged this as the
gap between "the gallery works" and "the gallery is genuinely
ready-to-use".

## Items

- [ ] Add an optional `body?` field to `CuratedEndpoint` — a JSON
      skeleton string applied to the request's body when the method
      takes one.
- [ ] Add an optional `description?` field surfaced somewhere the user
      sees it (request name tooltip, or a `// ...` comment in the body).
- [ ] Fill in body skeletons for the POST/PUT endpoints in the
      Cloudflare and Stripe curated sets (create customer, create
      payment intent, create/update DNS record, upload Worker script).
- [ ] `buildCuratedItems` applies `body` to the `RequestSnapshot`
      (`{mode:"raw"/"json", text:<skeleton>}`); extend `curated.test.ts`.

## Acceptance

Enabling Stripe and opening "Create customer" shows a ready JSON body
skeleton with the common fields, not an empty body.

## Tradeoffs

Keep skeletons minimal — the 3-5 most common fields, not the full
schema. The point is a head start, not a spec dump. Body content is
hand-maintained alongside the endpoint list (same maintenance posture
as the curated endpoint sets themselves).

## How to work on this

`CuratedEndpoint` is in `frontend/src/lib/integrations/curated/types.ts`;
`buildCuratedItems` (same dir, `build.ts`) is where the body would be
attached to `curatedSnapshot`. Pure + already unit-tested.
