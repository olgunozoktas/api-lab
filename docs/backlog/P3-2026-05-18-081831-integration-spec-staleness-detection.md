# Integration spec staleness detection + auto-update

GitHub Issue: [#38](https://github.com/olgunozoktas/api-lab/issues/38)

Priority: P3

## Context

Follow-up to `docs/backlog/P2-2026-05-18-081623-integrations-gallery-provider-collections.md`
(the integrations gallery initiative, captured 2026-05-18). That item
auto-fetches a provider's OpenAPI spec once, on enable, and lands it
as a collection.

But provider specs **drift** — Cloudflare, Stripe and AWS revise their
APIs continuously. An integration enabled months ago silently serves
a stale surface: missing new endpoints, wrong shapes. The user has no
signal that their integration has fallen behind, and no one-click way
to catch up.

Related: `lib/integrations/fetch.ts` (the fetch pipeline from the
parent item), `store/integrations.ts` (the enabled-integrations
slice), the toast severity system (`lib/toast.ts`, shipped #30).

## Items

- [ ] **Spec version capture** — when an integration is fetched,
      record a fingerprint (HTTP `ETag` / `Last-Modified`, or a hash
      of the spec body) per integration in `store/integrations.ts`.
      - Tests: fingerprint capture + persistence round-trip.
- [ ] **Staleness check** — a lightweight conditional re-fetch (HEAD
      or `If-None-Match`) that compares the live fingerprint to the
      stored one and marks the integration stale on mismatch. Run on
      gallery open and/or app launch.
      - Tests: `lib/integrations/__tests__/staleness.test.ts` —
        fresh vs stale vs unreachable.
- [ ] **Stale badge + refresh affordance** — the gallery card for a
      stale integration shows a badge and a one-click "Update" that
      re-runs the import pipeline. Surface the result via a toast.
      - Ship-it-fully: badge visible on the card; "Update" reachable;
        all strings via `t()`.

## Acceptance

An enabled integration whose upstream spec has changed is flagged
stale in the gallery; one click re-imports the current spec; an
unreachable provider fails quietly without flapping the badge.

## Tradeoffs & risks

A staleness check is a network call — gate it (on gallery open, not a
background poll) to avoid noise and battery cost. ETag support varies
by provider; fall back to a body hash when headers are absent.
Re-importing must not clobber any edits the user made to the
integration's requests — decide whether "Update" replaces or merges
(replace is simpler; flag merge as future work).

## How to work on this

Start with version capture in the fetch pipeline (cheap, additive),
then the staleness check, then the gallery UI. This item depends on
the integrations gallery (parent item) already shipping its fetch
pipeline + gallery modal. Reuse `lib/integrations/fetch.ts` and the
toast system. Tests: `cd frontend && dnpm run test`; typecheck
`dnpm isolated npx tsc --noEmit`. Backlog file:
`docs/backlog/P3-2026-05-18-081831-integration-spec-staleness-detection.md`.
