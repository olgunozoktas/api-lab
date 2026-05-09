# AI assist via vercel-labs/json-render

GitHub Issue: [#19](https://github.com/olgunozoktas/api-lab/issues/19)

## Why this idea

User asked if we can use vercel-labs/json-render. Investigation: it's a generative-UI framework, NOT a JSON viewer. Define a catalog of allowed components + actions; an AI model emits JSON specs constrained to that catalog; the framework renders them. Not the right tool for response viewing or body editing.

But it IS a great fit for a future "AI assist" feature: natural-language → composer fields. Type "POST a user signup with email + password" and the AI emits a json-render spec that fills the request composer. Constrained generation guarantees the AI can only produce valid composer states (no hallucinated UI).

## Items

- [ ] Define a catalog of api-lab composer "actions" — set method, set URL, add header, add param, set auth, set JSON body
- [ ] Wire a small chat input in the sidebar (toggleable) that talks to a configured AI provider
- [ ] Provider config: API key + model + base URL — settings modal entry
- [ ] On user prompt, send {prompt, current_state} → receive json-render spec → apply to composer
- [ ] Privacy: keep this opt-in only; never share the API key elsewhere; log nothing

## Tradeoffs

- Adds an external API dependency (OpenAI/Anthropic/local llama)
- json-render bundle (Apache-2.0, ~unknown size) needs measuring
- Keep AI features behind a clear feature flag — local-first ethos must not regress
