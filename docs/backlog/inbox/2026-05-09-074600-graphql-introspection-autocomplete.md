# GraphQL schema-aware autocomplete

GitHub Issue: [#20](https://github.com/olgunozoktas/api-lab/issues/20)

cm6-graphql supports schema-aware autocomplete when given a `GraphQLSchema` instance. We currently use it without a schema (just syntax highlight + bracket matching).

## Items

- [ ] On URL change in GraphQL mode, debounce + send introspection query (`{ __schema { ... } }`)
- [ ] Cache introspection result per `{url, auth-fingerprint}` in localStorage with TTL (e.g. 1 day)
- [ ] Build `GraphQLSchema` via `buildClientSchema()` from `graphql/utilities`
- [ ] Pass `schema` extension to CodeEditor via a new prop (`graphqlSchema?: GraphQLSchema`)
- [ ] Status indicator: "Schema loaded ✓" / "Schema unavailable" near the URL bar

## Tradeoffs

- Adds graphql peer dep (already pulled in by cm6-graphql)
- Some servers disable introspection in production — graceful fallback to no-schema mode
- Bundle: `graphql` is ~80 KB minified — already there as cm6-graphql peer
