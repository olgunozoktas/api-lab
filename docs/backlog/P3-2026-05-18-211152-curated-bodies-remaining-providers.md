# Curated body skeletons + descriptions — the remaining 5 providers

Priority: P3

## Context

Follow-up to `docs/backlog/done/P3-2026-05-18-141231-curated-endpoint-bodies-descriptions.md`
(shipped 2026-05-18). That slice added the `body` / `description`
framework to `CuratedEndpoint` and filled in **Cloudflare** + **Stripe**
(the two providers the parent backlog named — they predated the
5-provider expansion).

The gallery now has 7 providers. The other five — **GitHub**,
**OpenAI**, **Slack**, **Notion** — still import their POST/PATCH
endpoints with empty bodies and no descriptions, so the gallery is
half ready-to-use. **Linear** is GraphQL-only — its single endpoint
could ship a starter query.

## Items

- [ ] GitHub — JSON body skeletons for Create repo, Create issue,
      Update issue, Create pull request; descriptions on all.
- [ ] OpenAI — JSON skeletons for Create chat completion, Create
      embeddings, Create image, Create moderation, Create batch (the
      common ones); descriptions on all.
- [ ] Slack — JSON skeletons for Post message, Update message, Create
      channel, Add reaction; descriptions on all.
- [ ] Notion — JSON skeletons for Create page, Query database, Search,
      Append block children; descriptions on all. (Note: Notion needs
      a `Notion-Version` header — already mentioned in its file
      header.)
- [ ] Linear — seed the single GraphQL endpoint with a starter query
      (a `viewer { id name }` query in `gql.query`, not `body`). Needs
      a small `buildCuratedItems` tweak to apply a `graphqlQuery`
      field, or accept it's out of scope.

## Acceptance

Enabling any of GitHub / OpenAI / Slack / Notion lands write endpoints
with a ready body skeleton in the right format; every curated request
shows a hover description.

## Tradeoffs

Pure data — the `body` / `description` framework already exists, this
is just filling provider files. Keep skeletons to 3-5 common fields
(the parent slice's posture). All four REST providers are JSON APIs,
so `mode: "json"` throughout — no form-encoding wrinkle (that was
Stripe-specific). Linear's GraphQL-query seeding is the one item that
needs a code tweak; split it out if it complicates the slice.

## How to work on this

`CuratedEndpoint.body` / `description` are in
`frontend/src/lib/integrations/curated/types.ts`; the provider files
are siblings (`github.ts`, `openai.ts`, `slack.ts`, `notion.ts`,
`linear.ts`). `buildCuratedItems` already applies `body` +
`description` — REST providers need only data edits. Run
`cd frontend && dnpm run test` + `dnpm run typecheck`.
