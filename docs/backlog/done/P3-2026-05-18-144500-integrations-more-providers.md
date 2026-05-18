# Integrations gallery — add GitHub, OpenAI, Slack, Notion, Linear

Priority: P3

## Context

User request (2026-05-18, mid-session): after the curated-sourcing
redesign made the integrations gallery work, expand the catalog
beyond Cloudflare + Stripe. The curated model makes a new provider
cheap — a small hand-authored endpoint data file plus a registry
entry.

## Items

- [x] GitHub curated provider — repos, issues, PRs, actions, user.
- [x] OpenAI curated provider — chat, models, embeddings, images,
      audio, files, moderation, batches.
- [x] Slack curated provider — messages, conversations, users, files,
      reactions, auth.
- [x] Notion curated provider — pages, databases, blocks, search,
      users.
- [x] Linear curated provider — GraphQL-only; added a `graphql` flag
      to `CuratedEndpoint` so the imported request opens in the
      composer's GraphQL tab.
- [x] Registry entries + tests covering every shipped provider.

## Acceptance

The gallery lists seven providers; enabling any of GitHub / OpenAI /
Slack / Notion / Linear lands a usable, sanely sized collection with
auth pre-scaffolded.

## Tradeoffs

Linear is GraphQL-only — it can't be a multi-endpoint REST collection,
so it ships as a single GraphQL endpoint. Real per-operation Linear
queries wait on the `curated-endpoint-bodies-descriptions` follow-up
(curated endpoints carrying request bodies).

## How to work on this

Curated providers live in `frontend/src/lib/integrations/curated/`;
register them in `registry.ts`. Shipped via the curated framework
from `P2-2026-05-18-111329-integration-provider-sourcing-redesign.md`.
