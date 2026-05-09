# API Lab → Postman / Insomnia / Bruno parity (and beyond)

Date: 2026-05-09 (initial draft)
Owner: api-lab project — solo author + Claude Code in auto mode
Status: **Draft** — to be iterated through `/plan-ceo-review`,
`/plan-eng-review`, and `/frontend-design:frontend-design`.

## North-star

API Lab should become the most ergonomic, fastest, and most native-feeling API
workbench on macOS — measurably better than Postman, Insomnia, Bruno, and
Hoppscotch on the dimensions developers actually use day-to-day:

1. **Speed.** Cold start < 200 ms. UI input → request fired round-trip in
   < 300 ms on local services. Tab switch < 16 ms (always one frame).
2. **Native feel.** No Electron. No mandatory account. No telemetry.
   Themes that match macOS Sequoia + Tokyo Night + GitHub Light. ⌘ shortcuts
   that match the platform.
3. **Honesty about state.** Every request, environment, collection, secret,
   sync target is visible to the user as a file or a clearly-labeled key
   in the store. No hidden state. Git-syncable by default.
4. **Power without ceremony.** Pre/post-request scripts, OAuth 2.0 flows,
   gRPC, mock servers, OpenAPI editing — all available, none in your way
   when you just want to fire `GET https://api.example.com/users`.
5. **Bundled toolkit, not a SaaS.** All features run on the user's machine.
   Optional cloud sync exists (encrypted, opt-in, BYO storage). Nothing
   phones home.

## Where we are today (2026-05-09)

Shipped:

- **Phase A** — composer (REST + GraphQL), native HTTP via Zig+curl,
  fetch fallback, environments + `{{var}}`, collections, history,
  3-pane UI, dark/light/auto themes, TR/EN i18n.
- **Phase B** — multi-request workspace (tabs, drag-reorder, dirty
  indicator, ⌘+P fuzzy switcher across tabs/collections/history,
  ⌘+T/W/1..9 shortcuts, persist v2 migration).
- **Phase C** — WebSocket workspace (auto-detect ws/wss → swap layout,
  status pill, message log with timestamps + JSON pretty-print + JSON
  badge, send box ⌘+Enter, ping helper) + 6-language code generation
  (cURL, fetch, axios, Python `requests`, Go `net/http`, Node.js `https`).
- **Phase D-partial** — Tokyo Night + GitHub Light themes, Settings hub
  with theme/language/request-defaults, focus-visible accent ring,
  proper kbd styling.
- **Phase F** — Vitest (72 tests) + Zig handler unit tests (19) +
  GH Actions CI (Zig macOS + frontend Linux) + release workflow
  (macOS arm64 + x86_64 → draft GH release w/ sha256 sidecars) +
  pre-commit hooks (zig fmt, prettier --check) + bundle-size guardrail.

Approximate line count: ~5500 LOC frontend + ~2500 LOC Zig.
Bundle: 1016 KB JS / 313 KB gz / 50 KB CSS.

## Feature gap vs. peers (categorized)

Coarse audit against Postman v11, Insomnia 2024.x, Bruno v2, Hoppscotch
self-hosted. ✅ shipped, 🔶 partial, ❌ missing.

### Composer + protocols

| Feature | API Lab | Postman | Insomnia | Bruno | Hoppscotch |
|---|---|---|---|---|---|
| REST (HTTP) | ✅ | ✅ | ✅ | ✅ | ✅ |
| GraphQL composer | ✅ | ✅ | ✅ | ✅ | ✅ |
| GraphQL schema introspection / autocomplete | ❌ | ✅ | ✅ | ✅ | ✅ |
| WebSocket | ✅ | ✅ | ✅ | ✅ | ✅ |
| Server-Sent Events (SSE) | ❌ | ✅ | ✅ | ✅ | ✅ |
| gRPC (unary + streaming) | ❌ | ✅ | ✅ | ✅ | partial |
| Socket.IO | ❌ | ✅ | ✅ | ❌ | ❌ |
| MQTT | ❌ | ✅ | ❌ | ❌ | ✅ |
| File upload (multipart/form-data) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Binary body | ❌ | ✅ | ✅ | ✅ | ✅ |
| Request cancellation + progress | ❌ | ✅ | ✅ | ✅ | ✅ |

### Auth

| Feature | API Lab | Peers |
|---|---|---|
| Bearer | ✅ | ✅ |
| Basic | ✅ | ✅ |
| API Key (header) | ✅ | ✅ |
| API Key (query / cookie) | ❌ | ✅ |
| OAuth 1.0a | ❌ | ✅ |
| OAuth 2.0 (auth code, client credentials, password, implicit, PKCE, device) | ❌ | ✅ |
| AWS Signature v4 | ❌ | ✅ |
| Azure AD | ❌ | ✅ (Postman) |
| HAWK / NTLM / Digest | ❌ | ✅ |
| mTLS (client certs) | ❌ | ✅ |
| ASAP (Atlassian) / Akamai EdgeGrid | ❌ | partial |

### Body editors + response viewers

| Feature | API Lab | Peers |
|---|---|---|
| JSON editor (CodeMirror 6) | ✅ | ✅ |
| Form-urlencoded | ✅ | ✅ |
| Multipart form-data with file picker | ❌ | ✅ |
| Binary file body | ❌ | ✅ |
| GraphQL body | ✅ | ✅ |
| JSON tree response | ✅ | ✅ |
| HTML preview | ❌ | ✅ |
| Image preview | ❌ | ✅ |
| PDF preview | ❌ | partial |
| Audio/Video preview | ❌ | ✅ (Postman) |
| Hex viewer | ❌ | ✅ |
| Response diff (compare two responses) | ❌ | ✅ |
| Response visualizer (charts, tables) | ❌ | ✅ (Postman scripts) |

### Scripting + testing

| Feature | API Lab | Peers |
|---|---|---|
| Pre-request scripts (JS sandbox) | ❌ | ✅ |
| Post-response scripts / tests | ❌ | ✅ |
| Built-in assertion library (chai-style) | ❌ | ✅ |
| Test runner (run a collection) | ❌ | ✅ |
| Newman-equivalent CLI (run from terminal / CI) | ❌ | ✅ |
| Request chaining (use response[A] in request[B]) | ❌ | ✅ |
| Variable extraction from response | ❌ | ✅ |
| Performance / load testing | ❌ | ✅ (Postman) |
| Scheduled monitors | ❌ | ✅ (cloud) |

### Workspace + collaboration

| Feature | API Lab | Peers |
|---|---|---|
| Folders / nested collections | ❌ | ✅ |
| Per-folder auth + headers + scripts | ❌ | ✅ |
| Workspace-level variables | 🔶 (env only) | ✅ |
| Cloud sync (account-based) | ❌ | ✅ Postman/Insomnia |
| Git sync (file-based, BYO repo) | ❌ | ✅ Bruno (USP) |
| Team workspaces / sharing / comments | ❌ | ✅ |
| Per-request documentation | ❌ | ✅ |
| Public collection sharing | ❌ | ✅ |

### Import / Export

| Feature | API Lab | Peers |
|---|---|---|
| cURL import | ❌ | ✅ |
| Postman v2 collection import/export | ❌ | ✅ |
| OpenAPI 3.x import | ❌ | ✅ |
| Insomnia v4 import/export | ❌ | ✅ |
| Bruno collection format | ❌ | ✅ |
| HAR import (browser DevTools export) | ❌ | ✅ |
| Swagger 2.0 | ❌ | partial |
| Generate client SDK from OpenAPI | ❌ | ❌ (we'd be first) |

### Spec-driven dev

| Feature | API Lab | Peers |
|---|---|---|
| OpenAPI editor with validation | ❌ | ✅ Postman, Insomnia (Inso CLI) |
| Spectral linting | ❌ | ✅ Stoplight Studio, Insomnia |
| Doc generation from spec | ❌ | ✅ |
| Mock server from spec | ❌ | ✅ |
| Spec → request collection (one-click) | ❌ | ✅ |
| Diff between spec versions | ❌ | partial |

### Mock + monitor

| Feature | API Lab | Peers |
|---|---|---|
| Local mock server | ❌ | ✅ Postman, Insomnia |
| Mock from OpenAPI examples | ❌ | ✅ |
| Custom mock rules (regex, JSONPath) | ❌ | ✅ |
| Health-check monitors | ❌ | ✅ Postman cloud |
| Cron-scheduled runs | ❌ | ✅ Postman cloud |

### Power-user UX

| Feature | API Lab | Peers |
|---|---|---|
| Quick switcher (⌘+P) | ✅ | ✅ |
| Command palette (⌘+Shift+P) | ❌ | ✅ Postman v11 |
| Vim mode in editors | ❌ | partial |
| Snippets library | ❌ | partial |
| Request templates | ❌ | partial |
| Keyboard-only navigation everywhere | 🔶 | partial |
| Onboarding tour | ❌ | ✅ |
| Saved-search / smart filters in history | ❌ | ✅ |
| Cookie jar UI | ❌ | ✅ |
| Proxy config (HTTP / SOCKS) | ❌ | ✅ |

### Native + distribution

| Feature | API Lab | Peers |
|---|---|---|
| macOS native (no Electron) | ✅ (Zig + WKWebView) | ❌ all peers Electron-based |
| Linux build | ❌ (zero-native supports) | ✅ |
| Windows build | ❌ (zero-native supports) | ✅ |
| Notarized .dmg | ❌ | ✅ |
| Homebrew cask | ❌ | ✅ |
| Auto-update | ❌ | ✅ |
| Tiny binary | ✅ (3 MB) | ❌ all peers ~120-200 MB |
| Code-signed | ❌ | ✅ |

## Phase plan

Each phase below targets a coherent slice of the gap. Phases are **sized
to land in 1–2 weeks of focused work**, with sub-items that can ship
independently. Priority is by user-impact-per-engineer-day, not feature
parity for its own sake — we ship the things people actually use first.

### Phase G — Auth breadth + cookies + proxy (P1 next-up)

**Goal**: cover the auth methods that block real-world usage — OAuth 2.0
in particular is the #1 gap.

**Items**:

- OAuth 2.0 generic flow (auth code + PKCE) — opens the auth URL in a
  separate WKWebView, captures the redirect, exchanges the code for a
  token. Token cached per-request with refresh handling.
- OAuth 2.0 client credentials (server-side, no browser).
- OAuth 2.0 password grant (legacy but real).
- AWS Signature v4 (request signing for AWS APIs).
- API Key in query / cookie locations (we have header only).
- Cookie jar UI — list / edit / delete cookies, scope to URL pattern.
- Proxy config: HTTP / HTTPS / SOCKS5 in Settings.
- mTLS — load client cert + key + passphrase per environment.

**Acceptance**: An engineer can hit a real OAuth-protected API
(e.g. Google Calendar) end-to-end without scripting. AWS S3 GetObject
works with SigV4. Proxy traffic visible in Charles / mitmproxy.

**Tradeoffs**: OAuth flow needs a popup WKWebView — depends on
zero-native exposing a "open auxiliary window" primitive (it does).
SigV4 implementation is library-free (~80 LOC of crypto).

**Why P1**: every Postman user we'd want to migrate uses OAuth 2.0.
Without it, we're a curl wrapper.

### Phase H — Pre/post scripts + collection runner + assertions (P1)

**Goal**: the killer Postman feature — write JS that runs before and
after each request to set vars, assert state, chain calls. Plus a
runner that fires a whole collection in sequence with a pass/fail
report.

**Items**:

- Pre-request script editor (JS, sandboxed). Access to `pm.environment.set`,
  `pm.request.headers.add`, `pm.variables.replaceIn(...)`.
- Post-response script editor with `pm.test("name", () => { ... })` and
  a chai-style assertion library.
- Sandbox: WKWebView's `WKUserScript` injection at world isolation,
  OR a fresh `iframe` with strict CSP. NO `eval` against the main app
  context.
- Collection runner: sequential or parallel (configurable), iteration
  data file (CSV / JSON), variables-per-iteration, summary view with
  per-request status + duration + assertion pass/fail.
- Newman-equivalent CLI: a Zig binary `api-lab-run` that loads a
  collection JSON + env JSON and runs it headless. Exit code 0 / 1.

**Acceptance**: a user pastes a Postman pre-request script and it runs
identically. `api-lab-run --collection x.json --env prod.json` exits 0
on green and prints a summary table.

**Tradeoffs**: the JS sandbox is the load-bearing piece. WKWebView
isolation is good but passing variables in/out of the sandbox needs a
careful message-port boundary. Postman's `pm.*` API is sprawling — we
ship the 80% that real scripts use.

### Phase I — Imports + Postman / OpenAPI / Bruno / Insomnia / HAR (P1)

**Goal**: zero-friction migration. A Postman user drops their export,
clicks once, and their entire workspace lights up.

**Items**:

- cURL import — paste a `curl` command, get a populated request.
- Postman v2.1 collection import (the v2.1 schema is the de-facto
  standard).
- Postman environment import.
- Insomnia v4 (YAML / JSON).
- Bruno (BRU files — Bruno's plain-text format; closest to ours
  philosophically).
- HAR import (Chrome DevTools export → batch import as history).
- OpenAPI 3.x → collection (every operation becomes a request, with
  example bodies populated from the spec).
- Export to: Postman v2.1, OpenAPI 3.x (sketch), HAR (replay log),
  Bruno BRU.
- Round-trip safety: import → export → import gives identical state.

**Acceptance**: drop the official Postman 2.1 example schema, get a
working collection. Drop a real-world OpenAPI spec (Stripe's), get
~600 requests in a tree.

**Tradeoffs**: parsers are tedious but bounded. v2.1 has weird
event-script + variable-scoping corners — start with read-only import,
add export when scripts ship.

### Phase J — Body breadth + response viewers + cancellation (P2)

**Goal**: stop being "JSON-only". Real APIs send images, files, binary
streams, big responses.

**Items**:

- Multipart form-data with native file picker (zero-native exposes a
  `dialog.open` primitive).
- Binary body (load from file).
- Image preview (PNG / JPG / WebP / GIF / AVIF).
- HTML preview in a sandboxed iframe (script-disabled, strict CSP).
- PDF preview via `pdf.js` (lazy-loaded chunk).
- Audio preview via `<audio>`.
- Hex viewer for unknown content types.
- Response diff: pick two history entries, see a side-by-side diff
  (json-diff for JSON, line-diff for text, byte-diff for binary).
- Request cancellation: red X next to a busy Send button, ⌘+. shortcut.
- Streaming response (SSE, large download): show progress bar,
  incremental render.

**Acceptance**: GET on a Stripe receipt PDF renders. Image upload
works. SSE feed updates live. Cancellation actually aborts the
underlying curl process.

### Phase K — Spec-first: OpenAPI editor + Spectral linting + doc gen (P2)

**Goal**: be a credible alternative to Stoplight Studio for solo
devs who want a unified spec + client tool.

**Items**:

- Side-pane OpenAPI editor (CodeMirror, YAML + JSON).
- Live validation against the OpenAPI 3.0 / 3.1 schemas.
- Spectral linting with built-in rulesets (`@stoplight/spectral-rulesets`).
- Custom rule editor.
- Spec → preview docs (Redoc-style read view).
- Spec → mock server (Phase L below).
- Spec → request collection (one-click "import all operations").
- Diff between two spec versions (semantic, not line-based).

**Acceptance**: open Stripe's OpenAPI spec, get inline lint warnings
within 1 second of opening. Save a custom rule "all operations must
have summary".

### Phase L — Mock server + monitors + scheduled runs (P2)

**Goal**: turn API Lab into a verb, not a noun. "I'm gonna mock that
in API Lab" should be possible.

**Items**:

- Local mock server: Zig `http.Server` on a configurable port that
  serves responses from collection examples.
- Mock from OpenAPI examples (use `examples` and `default` fields).
- Custom routing rules: regex on path, header match, body JSONPath
  match → which example to serve.
- Scheduled monitors: macOS `launchd` job (or app's own background
  loop) that runs a collection on cron, persists the result, alerts
  on failure (notification center).
- Performance test mode: fire N parallel requests, p50/p95/p99 graphs.

**Acceptance**: `curl http://localhost:1928/api/users` returns the
mock response we configured. Monitor that hits a real endpoint every
5 min, surfaces a red dot in the UI when it fails.

### Phase M — Sync, collaboration, polish (P2)

**Goal**: solo dev wants their workspace on three machines. Two devs
want to share a collection. Neither wants a SaaS account.

**Items**:

- Git sync: collections + environments + workspace settings stored as
  files in a Git repo of the user's choice. Bruno's USP, but we make
  it more visual (a Git status panel inside the app, like VSCode's).
- Cloud sync (encrypted, end-to-end) via the user's S3 bucket /
  Cloudflare R2 / iCloud Drive — no account-based SaaS.
- Conflict-free workspace structure (CRDT or simple last-writer-wins
  with manual conflict resolution UI).
- Comments on requests / folders (Markdown + @mentions).
- Per-folder auth + headers + scripts (inheritance like Postman).
- Workspaces — multiple isolated environments in one app.
- Workspace-level variables.

### Phase N — Cross-platform + distribution + auto-update (P2)

**Goal**: make the project installable on Linux + Windows. Auto-update
on macOS so users don't fall behind.

**Items**:

- Linux build (zero-native supports WebKitGTK + Capybara).
- Windows build (zero-native supports WebView2).
- Notarized macOS .dmg with universal binary.
- Homebrew cask: `brew install --cask api-lab`.
- AppImage / deb / rpm for Linux.
- MSI / portable .exe for Windows.
- Auto-update (Sparkle on macOS, custom on Linux/Windows).

### Phase O — Performance + power-user UX (P3)

**Goal**: the things that compound. Vim mode, command palette, snippets,
better keyboard navigation.

**Items**:

- Command palette ⌘+Shift+P — every action in the app discoverable +
  keyboard-runnable.
- Snippets library: save a request body / header set as a reusable
  snippet, paste with a fuzzy search.
- Request templates per language / framework / API (REST, GraphQL,
  Stripe, AWS).
- Vim mode in CodeMirror editors.
- Onboarding tour for first-time users.
- Saved searches in history.
- Code-splitting: dynamic-import CodeMirror, codegen formatters,
  json-view, pdf.js → drop initial bundle from 1015 KB to ~400 KB.
- Web Worker for JSON formatting / huge response rendering.

## Architectural decisions to lock before Phase H

These are load-bearing for everything after, so the eng-review
discussion has to converge on them first:

1. **Persisted state shape** — we currently use `localStorage` via
   Zustand persist v2. Phase H adds scripts → big strings. Phase I
   adds imports → potentially huge collections. localStorage caps at
   ~5 MB; we'll need to migrate to IndexedDB or to file-backed
   storage via a new Zig bridge command. Decision: how / when?
2. **JS sandbox for pre/post scripts** — WKWebView `WKUserScript` in
   isolated world vs. fresh sandboxed iframe vs. QuickJS WebAssembly
   evaluator. Tradeoffs: API surface, perf, security boundary.
3. **Collection format** — match Bruno's BRU plain-text? Invent ours?
   Hybrid (canonical JSON, optional BRU export)? Affects Git-sync UX.
4. **Sync strategy** — file-based (Bruno) vs. CRDT (Yjs / Automerge)
   vs. last-writer-wins + manual conflict UI. Affects offline + multi-
   machine UX.
5. **Plugin / extension model?** — Postman's plugins are weak;
   Insomnia's are middling; nobody loves them. Skip until users ask?
6. **Mock + monitor: in-process or sidecar?** Spawn a separate Zig
   process for the mock server vs. coexist in the same shell.
   Affects window-close behavior.

## Frontend design direction (placeholder for `/frontend-design`)

The current UI is functional but utilitarian. To match the bar we're
setting against Postman / Insomnia / Bruno, the design needs:

- **Visual hierarchy** — current 3-pane is uniform-density. Heavy users
  want a visible "active" focal point. Subtle background-tint shift
  on the active pane?
- **Density modes** — compact / comfortable toggle. Postman is
  comfortable-only; some users want compact for laptop screens.
- **Status surfaces** — request count per environment, sync status,
  active sandbox vs. live, error/warning summary.
- **Collection tree polish** — folders, drag-reorder across folders,
  per-folder badges (count of requests, auth inheritance indicator).
- **Empty states** — "you have 0 collections" should feel inviting,
  not dead. CTAs: "Import from Postman", "Import from cURL", "New
  collection".
- **Onboarding** — first-launch tour (skippable). 4 frames: compose
  a request, save to collection, set up an env, share via export.
- **Settings expansion** — current Settings modal is single-page.
  Phase H/I/J/K add a lot of settings. Sidebar navigation in Settings.

The `/frontend-design:frontend-design` skill should produce production-
quality mockups of the redesigned: TopBar, Sidebar, RequestComposer,
ResponseViewer, plus the new surfaces (CookieJar, OAuth flow modal,
Mock server panel, OpenAPI editor split-pane, Collection runner result
view).

## Sequencing

```
NOW   ───────────────────────────────────────────────────────────────►   YEAR-END
 ▼                                                                          ▼

[Phase D-extras]   Solarized + a11y + proxy → 1 day
[Phase G]          Auth breadth + cookies + proxy → 1 week
[Phase H]          Scripts + runner + CLI → 2 weeks
[Phase I]          Imports + exports → 1.5 weeks
[Phase J]          Body breadth + previews + cancellation → 1 week
[Phase K]          OpenAPI editor + Spectral + doc gen → 1.5 weeks
[Phase L]          Mock + monitors + perf tests → 1.5 weeks
[Phase M]          Sync + collab + polish → 2 weeks
[Phase N]          Cross-platform + distribution + auto-update → 1 week
[Phase O]          Power-user UX + perf + code-split → ongoing
```

Total ≈ 12–14 weeks of focused work. Realistic with the auto-mode
ship cadence we've established this session (4 phases shipped in one
day across codegen + WebSocket + CI fix + build script).

## Risks

1. **Scope creep into a Postman clone we can't maintain.** Mitigation:
   every phase passes the `/plan-ceo-review` "is this a 10-star feature
   or table-stakes?" test. Skip Postman features users don't actually
   use (HAWK auth, Postman flows, postman cloud monitors).
2. **JS sandbox security.** A pre-request script that escapes its
   sandbox can read every other tab's secrets. Mitigation: defense in
   depth — separate `WKWebView` for sandbox, hardened CSP, no shared
   storage, message-port-only communication.
3. **OAuth flow complexity.** Each provider has quirks (Google's
   localhost:port redirect, Atlassian's audience param, Microsoft's
   tenant-aware endpoints). Mitigation: ship the generic flow first,
   build provider presets after first 3 user reports.
4. **Bundle size.** Each new editor + lib (pdf.js, Spectral, Yjs)
   adds 100s of KB. Mitigation: dynamic-import everything that's not
   on the cold-start path. Phase O code-split is non-optional.
5. **Native shell limits.** zero-native is ours-and-Vercel's; some
   primitives (file picker, popup window for OAuth, system proxy
   detection, system notification for monitors) may need upstream
   contributions. Mitigation: capture those as separate backlog items
   in `~/Herd/zero-native` early.

## Open questions for the user

These are decisions only the project owner can make:

1. **Free, open source, sponsored, or paid?** The plan above assumes
   open-source forever. If we want to monetize (cloud sync as a paid
   tier, team features, etc.), it changes Phase M's design.
2. **Cloud sync target.** S3 / R2 / iCloud Drive / GitHub-as-storage?
   Each has UX + cost implications.
3. **Mobile companion app?** Phase N is desktop-only; mobile is a
   different commitment (~3 months).
4. **Naming.** "API Lab" is generic. Postman = "Postman", Insomnia =
   "Insomnia", Bruno = "Bruno". Worth a renaming pass before public
   launch?
5. **Public launch strategy.** Show HN at Phase H (scripts) or wait
   until Phase N (cross-platform)?

## Next actions (this week)

1. Walk this plan through `/plan-ceo-review` — challenge scope, find
   the 10-star angle.
2. Walk through `/plan-eng-review` — lock the architectural decisions
   (state, sandbox, sync model) before any phase ships.
3. `/frontend-design:frontend-design` — generate mockups for the
   redesigned surfaces.
4. Convert each phase into a `/backlog add` capture so the queue
   reflects the new direction. Some phases (G, H) become P1; older
   inbox items (codemirror-vs-monaco, etc.) get refined into supports
   for the new phases or `git rm`d as obsolete.
5. Re-evaluate Phase D-extras leftovers (Solarized, aria-live) — fold
   into Phase G or push to P3.
