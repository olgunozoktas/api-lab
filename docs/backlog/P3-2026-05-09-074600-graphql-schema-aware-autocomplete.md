# GraphQL schema-aware autocomplete

Created: 2026-05-09 07:46:00
Refined: 2026-05-16 08:30:00
Priority: **P3** (Enhancement to the existing GraphQL editor — real value, well-scoped, but a refinement of a shipped surface rather than a new one.)
GitHub Issue: [#20](https://github.com/olgunozoktas/api-lab/issues/20)
Status legend: `- [ ]` = to do, `- [x]` = implemented

## Context

Originally captured via /inbox on 2026-05-09 07:46:00.

The GraphQL editor uses `cm6-graphql` today for syntax highlighting +
bracket matching, but without a schema — so there is no field/type
autocomplete. `cm6-graphql` supports full schema-aware autocomplete
when handed a `GraphQLSchema` instance; the gap is fetching that
schema via introspection and wiring it into the editor.

## Items

- [ ] On URL change in GraphQL mode, debounce and send the
  introspection query (`{ __schema { ... } }`).
- [ ] Cache the introspection result per `{url, auth-fingerprint}` in
  `localStorage` with a TTL (~1 day).
- [ ] Build a `GraphQLSchema` via `buildClientSchema()` from
  `graphql/utilities`.
- [ ] Pass the `schema` to `CodeEditor` through a new optional prop
  (`graphqlSchema?: GraphQLSchema`) so the `cm6-graphql` extension
  picks it up.
- [ ] A status indicator near the URL bar — "Schema loaded ✓" /
  "Schema unavailable".

## Acceptance

In GraphQL mode, after the URL is set, the editor autocompletes
fields and types from the live schema; servers with introspection
disabled fall back cleanly to no-schema mode with the status
indicator showing why.

## Tradeoffs & risks

- Adds a `graphql` dependency — but it is already pulled in as a
  `cm6-graphql` peer, so no new bundle weight (~80 KB, already
  present).
- Some servers disable introspection in production — the no-schema
  fallback must be graceful, not an error state.
- The introspection query is an extra network call; debounce + cache
  keep it from firing on every keystroke.

## How to work on this

Wire the introspection fetch + cache first, then `buildClientSchema`,
then thread the `graphqlSchema` prop into `CodeEditor` so
`cm6-graphql` consumes it, then the status indicator last. Test
against a public introspection-enabled GraphQL endpoint and against
one with introspection disabled to prove the fallback. Reuse the
existing `CodeEditor` wrapper — add a prop, do not fork the component.
