# AI assist — natural-language → request composer

Created: 2026-05-09 07:45:00
Refined: 2026-05-16 08:30:00
Priority: **P3** (Speculative feature behind a feature flag — opt-in, adds an external AI dependency, and must not regress the local-first ethos. Worth queuing, not a committed direction.)
GitHub Issue: [#19](https://github.com/olgunozoktas/api-lab/issues/19)
Status legend: `- [ ]` = to do, `- [x]` = implemented

## Context

Originally captured via /inbox on 2026-05-09 07:45:00.

A user asked about using `vercel-labs/json-render`. Investigation:
it is a generative-UI framework, NOT a JSON viewer — so it is the
wrong tool for response viewing or body editing, but a good fit for a
future "AI assist" feature. The idea: define a catalog of allowed
api-lab composer actions; an AI model emits a json-render spec
constrained to that catalog; the framework applies it to the request
composer. Constrained generation means the AI can only produce valid
composer states — no hallucinated UI. Type "POST a user signup with
email + password" and the composer fills itself.

This stays speculative: opt-in, feature-flagged, and the local-first
ethos (no mandatory cloud, no telemetry) must not regress.

## Items

- [ ] Define a catalog of composer actions — set method, set URL, add
  header, add param, set auth, set JSON body — as the constrained
  surface the AI may emit.
- [ ] A toggleable chat input in the sidebar that talks to a
  configured AI provider.
- [ ] Provider config in the Settings modal — API key + model + base
  URL (works with OpenAI / Anthropic / a local llama endpoint).
- [ ] On a prompt, send `{prompt, current_state}` → receive a
  json-render spec → apply it to the composer.
- [ ] Privacy: opt-in only; the API key never leaves the provider
  call; log nothing.

## Acceptance

With AI assist enabled and a provider configured, a natural-language
prompt fills the request composer with a valid request, and with it
disabled the app behaves exactly as today (no network, no AI code
path reached).

## Tradeoffs & risks

- Adds an external API dependency (OpenAI / Anthropic / local llama).
- The `json-render` bundle (Apache-2.0) size is unmeasured — measure
  before committing; lazy-load it so it never touches the main bundle.
- AI features must sit behind a clear feature flag — the local-first
  ethos must not regress for users who never opt in.

## How to work on this

Start by defining the action catalog — it is the contract everything
else depends on, and it bounds what the AI can do. Prototype the
provider call + spec-application loop against one provider before
generalising the config. Lazy-import `json-render` (mirror the
pdfjs-dist lazy-chunk pattern from the binary-viewers slice) so the
main bundle is untouched for users who never enable AI assist. Gate
the entire feature on an explicit, default-off setting.
