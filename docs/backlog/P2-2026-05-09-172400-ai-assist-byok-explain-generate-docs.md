# Phase A.1 — AI assist (BYOK: explain, generate, draft tests, write docs)

Priority: P2

## Context

The CEO-lens differentiator from `docs/plans/piped-dazzling-pretzel.md`: AI assists every workflow but is never gatekept behind our account. User brings their own key (OpenAI / Anthropic / local Ollama) — we send their request context + prompt, surface the LLM's response.

## Items

- [ ] Settings → "AI" section: provider picker (OpenAI / Anthropic / Ollama / Custom HTTP), API key (stored in macOS Keychain), model name, base URL (for self-hosted)
- [ ] AI commands accessible via ⌘+I (Insert via AI):
  - **Explain this response** — paste the response into a chat thread with "What does this mean? What's wrong if anything?"
  - **Generate request from description** — natural language → request shape
  - **Draft tests for this request** — generate `pm.test(...)` blocks
  - **Write docs from request** — produce a Markdown description
  - **Suggest env vars** — analyze request and propose `{{var}}` extractions
- [ ] AI panel: side-pane with chat-style history + a fresh input
- [ ] Streaming via SSE (Phase J.3 prerequisite for the live token-by-token UX)
- [ ] No telemetry: requests go directly from app to user's chosen provider; nothing routes through our infra

## Acceptance

User pastes API key, asks "Explain this 401 response" → coherent answer streams in. "Draft tests for this endpoint" produces working `pm.test` blocks.

## Tradeoffs

API keys in Keychain (Phase G.1 prerequisite for Keychain bridge). Costs are user-borne, transparent.

## How to work on this

1. Phase G.1 (Keychain bridge) + J.3 (SSE) prerequisites.
2. Anthropic + OpenAI both speak SSE for streaming; same JSON shape after.
3. Local Ollama on `http://localhost:11434` — same OpenAI-compatible API.
