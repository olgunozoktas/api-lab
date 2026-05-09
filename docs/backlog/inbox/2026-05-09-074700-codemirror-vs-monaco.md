# Track CodeMirror vs Monaco decision

GitHub Issue: [#21](https://github.com/olgunozoktas/api-lab/issues/21)

We picked CodeMirror 6 for body + GraphQL editing (lightweight, modular). If users start asking for IDE-grade features that CM6 can't deliver cleanly, reconsider Monaco:

CM6 covers:
- Syntax highlight (JSON, GraphQL via cm6-graphql)
- Bracket matching, fold, line numbers
- History, search (built-in)
- Theme via Compartment

Monaco offers more:
- IntelliSense / proper LSP-style completions
- Multi-cursor, advanced refactors
- Diff editor
- Rich JSON schema validation with squiggles
- Larger ecosystem of premade language services

Decision triggers for switching:
- Requests like "show me errors as I type" with proper red-squiggles for invalid JSON schema
- Embedded LSP demand
- User feedback explicitly mentioning "VS Code-like" feel
- Pre-request scripts (Phase I) — Monaco's TypeScript service shines there

If we hit any of those, write a Monaco migration plan. Until then, CM6 stays.
