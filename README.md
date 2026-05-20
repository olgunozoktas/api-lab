# API Lab

[![CI](https://github.com/olgunozoktas/api-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/olgunozoktas/api-lab/actions/workflows/ci.yml)
[![Release](https://github.com/olgunozoktas/api-lab/actions/workflows/release.yml/badge.svg)](https://github.com/olgunozoktas/api-lab/actions/workflows/release.yml)

> Designed, built and maintained by **[Olgun Özoktaş](https://github.com/olgunozoktas)**.

A tiny native macOS API tester. Postman-style request composer with native HTTP transport (CORS-free), under **3 MB** binary, instant cold start.

Built on top of **[vercel-labs/zero-native](https://github.com/vercel-labs/zero-native)** — a Zig-based native shell (WebKit on macOS, WebKitGTK on Linux, WebView2 on Windows). Frontend is React 19 + Vite + TypeScript + Tailwind CSS v4 + Zustand + Radix-based shadcn primitives + CodeMirror 6 + lucide-react. Multi-language UI (TR + EN; more in 3 mechanical steps).

![API Lab screenshot](docs/screenshot.png)

## Features

- **Multi-request workspace** — open as many tabs as you want, each with its own state. ⌘+T new, ⌘+W close, ⌘+1..9 jump, ⌥⌘→/← cycle, ⌘+Shift+T reopen last closed, ⌘+K / ⌘+P fuzzy switcher across tabs + collections + history. Drag to reorder, middle-click to close, pin to survive bulk-close, right-click context menu, dirty dot when a tab diverges from its saved state. Tabs auto-name themselves from the URL when you haven't renamed them (`GET api.github.com/users/octocat` instead of three indistinguishable "New request" tabs). Strip scrolls horizontally when full (no visible scrollbar), and switching tabs auto-scrolls the active one into view.
- **REST + GraphQL composer** with method picker, params/headers/auth/body/graphql tabs
- **WebSocket workspace** — type `ws://` or `wss://` and the layout swaps to a full WS workbench: status pill, message log with timestamps + direction icons + JSON pretty-print + JSON detection badge, send box with ⌘+Enter, ping helper. Browser-native `WebSocket` API (no CORS for ws/wss).
- **Server-Sent Events panel** — `sse://` / `sses://` URLs activate a one-way stream tab with auto-reconnect, named-event tags, and last-event-id cursor capture.
- **gRPC panel** with reflection — `grpc://` / `grpcs://` URLs route through `grpcurl`. Reflection-cached service browser (5-min TTL per target), unary + server-streaming, paste-in mTLS credentials with hardened `0o700`/`0o600` per-call temp files.
- **Right-click → New request with protocol picker** — pick HTTP / GraphQL / WebSocket / SSE / gRPC when creating an entry under any folder; the URL prefix + composer tab pre-fill so you don't have to type `wss://` manually.
- **"Copy as code" generator** — emit the live request as cURL / JavaScript fetch / JavaScript axios / Python `requests` / Go `net/http` / Node.js `https`. Generated snippets carry the env-substituted URL, headers, body, and auth — copy-paste-runnable.
- **Native HTTP** via Zig handler that shells out to `curl` — sidesteps WebView CORS, exposes timing breakdown (DNS / connect / TTFB / total). Hover the elapsed-ms badge in the response head to see the breakdown; hover the status pill to see a plain-English description of the status class (1xx / 2xx / 3xx / 4xx / 5xx).
- **Request cancellation** — Send button morphs to a red Cancel; `⌘+.` (canonical macOS abort) fires the same handler. AbortSignal threaded through the fetch path.
- **Pre / post-request scripts** — QuickJS sandbox with a `pm.*` API subset (5s CPU / 10MB heap, no fetch/XHR). pm.test pass/fail tally + console output rendered inline.
- **Request body modes** — JSON (validated), `x-www-form-urlencoded`, raw, plus **multipart/form-data** and **binary** file uploads. Files are picked from disk and read by the native request path, so a large upload never crosses the JS bridge.
- **Local mock server** — turn a request's saved Examples into a real loopback HTTP server (`http://127.0.0.1:<port>`); curl, a browser, or any tool can hit it and get the saved response back, matched by method + path. Start / stop / list mocks from the top-bar Mock server panel.
- **Auth helpers**: Bearer, Basic, API Key (header), OAuth 2.0 helper variant (paste-token + Refresh), **AWS Signature v4** (S3 / API Gateway — signed locally, secret never leaves the app), and **mTLS** client certificates
- **JSON & GraphQL editor** powered by CodeMirror 6 (auto-close brackets, auto-indent, search, fold gutter, line numbers)
- **JSON tree response viewer** powered by `@uiw/react-json-view` (expand/collapse, copy-path)
- **Binary response viewers** — images, audio, video, and PDFs preview inline (PDFs page-by-page); other binary falls back to a hex view fed faithful bytes. Downloads are byte-identical.
- **Save as variable** — right-click any value in the response viewer to extract it into an environment variable (`{{access_token}}` etc.) for later requests.
- **Environments** with `{{var}}` substitution. URL bar shows a faded `→ resolved` preview below the input whenever the URL contains a `{{var}}`. Top-bar env switcher hides when there's only one; when multiple exist, each entry shows its `N vars` count badge. Single-env users see a clean top bar; the env switcher only appears once a second environment exists.
- **Collections** + history (last 200 requests) — persisted via IndexedDB with v1→v2→v3 migrations. Saved requests + history rows have right-click context menus (Replay / Open in new tab / Copy URL / Delete). History sidebar has status-class filter pills (All / 2xx / 3xx / 4xx / 5xx) on top, and the search box stacks with them. Collection items auto-name themselves from the URL like tabs do; ⌘+S commits the derived name so a folder of saved requests is never just three "New request" rows.
- **Postman v2.1 import** — drag-drop a collection JSON to bring the whole tree + variables over.
- **Recent history suggestions in the empty response pane** — when a fresh request hasn't been sent, the right pane lists deduped (`method + url`) recent calls as one-click loads with colored status pills, relative time, response size, and right-click context menu.
- **Richer empty states + per-panel hints** — the composer's Params / Headers / Auth / Body tabs each lead with a one-line "what this sends on the wire" note. The Environments modal greets you with a `{{name}}` explainer. Collection + History sidebars walk you through 2-3 concrete ways to populate them when empty.
- **In-app feature guides** — press `?` (or click the help-circle icon) for 17 curated walkthroughs (Quick start, Environments, Collections, Body modes, Auth, Mock server, Response viewers, gRPC, Cancellation, Streaming, Examples, Scripts, Save as variable, Copy as code, Postman import, Quick switcher, Keyboard shortcuts). Live search across title / group / body. Localized in TR + EN; falls back to EN per slug if a translation is missing.
- **In-app changelog** — top-bar clock-history icon opens "What's new". Auto-opens once on first launch after a version bump; manual opens don't touch lastSeen. Markdown bodies (incl. GFM tables) bundled at build time. Localized in TR + EN.
- **Settings hub** — single modal for theme, language, request defaults (timeout, redirect cap, TLS-skip, **outbound proxy** — HTTP / HTTPS / SOCKS5 — with per-field hints + "Reset to defaults" when anything differs from baseline), keyboard shortcut reference, and an **About** card showing app version + stack (Platform / Native shell / Frontend / Storage) + quick-link buttons (Guides / Changelog / GitHub) + a **Your data** stats grid (Requests / Folders / History / Environments / Examples). ⌘+B toggles the sidebar.
- **Themes** — auto / light / dark / Tokyo Night (dark) / GitHub Light / high-contrast, applied via `:root[data-theme="..."]` CSS variable swaps
- **i18n** — TR + EN today; adding a new language is 3 mechanical steps. Guide / changelog content also localized as `<slug>.<lang>.md` markdown.
- **Keyboard shortcuts** — see the [Keyboard reference](#keyboard-reference) below

## Quick start

Prerequisites:

- **Zig 0.16+** — `brew install zig`
- **`curl`** (preinstalled on macOS)
- **A frontend builder** (auto-detected by `./build.sh`):
  - Preferred: **OrbStack** (or Docker Desktop) + **`dnpm`** wrapper — frontend builds run inside a hardened Linux container; npm never touches your host. First-time setup in a fresh clone: `cd frontend && dnpm setup` (scaffolds the container, dependencies, and security baseline — see [`frontend/CLAUDE.md`](frontend/CLAUDE.md) for the full policy).
  - Alternative: **Docker Compose** alone — uses the project-rooted `docker-compose.yml` (less hardened than dnpm but still containerized)
  - Last resort: **Node 22 + `npm`** on the host (simplest, but sidesteps the supply-chain isolation — not recommended for daily use)

```bash
# Clone both repos as siblings — build.zig defaults to ../zero-native
git clone https://github.com/vercel-labs/zero-native.git
git clone https://github.com/olgunozoktas/api-lab.git

# One-shot: build frontend + Zig and launch the app (kills any prior instance)
cd api-lab
./build.sh                        # debug build + launch (default)
./build.sh --release              # ReleaseSafe optimize + launch
./build.sh --no-run               # build only (CI / iteration)
./build.sh --frontend-only        # just the Vite build
./build.sh --zig-only             # reuse existing frontend/dist/, skip Vite
./build.sh --use=docker           # force docker-compose path even if dnpm exists
./build.sh -Dzero-native-path=... # passthrough Zig flags

# Optional: install the pre-commit hook (zig fmt + prettier --check)
bash scripts/install-hooks.sh
```

If your `zero-native` checkout lives elsewhere:

```bash
./build.sh -Dzero-native-path=/path/to/zero-native
```

### Platform support

API Lab ships on **macOS** today (WKWebView). Linux and Windows are
declared in `app.zon` and the Zig shell builds against zero-native's
WebKitGTK / WebView2 hosts, but the build + run path on those platforms
is **not yet verified on real hardware** — tracked in the cross-platform
backlog item.

Per-platform dependencies:

| Platform | Webview | Extra deps |
| --- | --- | --- |
| macOS | WKWebView (system) | none — `curl` is preinstalled |
| Linux | WebKitGTK | GTK 4 + WebKitGTK dev libs — `apt install libwebkit2gtk-4.1-dev libgtk-4-dev` (Debian/Ubuntu) or `dnf install webkit2gtk4.1-devel gtk4-devel` (Fedora); `curl` is preinstalled on most distros |
| Windows | WebView2 | the **WebView2 runtime** — preinstalled on Windows 11, or the [Evergreen installer](https://developer.microsoft.com/microsoft-edge/webview2/) on older Windows. Resolving the `curl` dependency (bundle `curl.exe` vs. a native-HTTP bridge fallback) is still open |

`./build.sh` resolves the webview cache + persisted-state directories
per OS — `~/Library` on macOS, XDG base dirs on Linux, `%LOCALAPPDATA%`
on Windows.

### How `./build.sh` picks its frontend builder

The script auto-detects in this priority order. Override with `--use=<dnpm|docker|npm>`:

1. **`dnpm`** — preferred. Hardened container per `frontend/CLAUDE.md`: non-root, cap_drop ALL, custom seccomp, two-phase install with scripts-off, `npm audit` after every install, signature verification, trivy scan.
2. **`docker compose run --rm frontend-build`** — uses the project-rooted `docker-compose.yml`. Inline hardening: non-root UID 1000, cap_drop ALL, no-new-privileges, read-only rootfs, tmpfs scratch, `--ignore-scripts`, pinned npm registry. node_modules in a volume.
3. **`npm`** on the host — last resort with a loud warning. Only the `npm audit` defense applies; postinstall scripts run on the host's behalf.

### Why the build flow is one script (and not `zig build run`)

- The frontend (Vite + React + Tailwind v4 + CodeMirror 6) is a separate build that produces `frontend/dist/`, which the Zig shell serves via the `zero://app` asset handler.
- `zig build run` deliberately does NOT shell out to host `npm` — that would sidestep the dnpm sandbox.
- `./build.sh` sequences both halves in the right order, kills any already-running api-lab instance, and launches the new binary in the background. The dev loop is just: edit code → `./build.sh` → app reloads.

### Frontend-only commands (skip the Zig step)

When iterating on the React side without rebuilding the native shell:

```bash
# Preferred (dnpm):
cd frontend && dnpm install
cd frontend && dnpm run dev          # Vite dev server at 127.0.0.1:5173
cd frontend && dnpm run build        # produces frontend/dist/
cd frontend && dnpm run test         # vitest unit tests
cd frontend && dnpm run typecheck    # tsc --noEmit
cd frontend && dnpm run format:check # prettier check (--write blocked by RO mount)

# Without dnpm (uses docker-compose.yml):
docker compose run --rm frontend-build      # one-shot production build
docker compose run --rm frontend-test       # vitest run
docker compose run --rm frontend-typecheck  # tsc --noEmit
docker compose up frontend-dev              # Vite dev server on 127.0.0.1:5173
```

### Dev mode (HMR against the native window)

```bash
cd frontend && dnpm run dev   # Vite at 127.0.0.1:5173
# In another terminal:
ZERO_NATIVE_FRONTEND_URL=http://127.0.0.1:5173/ zig build run
```

## Architecture

**Two-tier:**

- **Zig native shell** (`src/`) — bridge handlers, WKWebView host, asset serving
- **Web frontend** (`frontend/`) — Vite + React + TypeScript + Tailwind v4, builds to `frontend/dist/`

**Bridge contract** — the only Zig↔JS surface (`src/main.zig`):

| Command                                  | Permissions  | Origin       | Purpose                                          |
|-------------------------------------------|--------------|--------------|--------------------------------------------------|
| `http.request`                            | `network`    | `zero://app` | curl subprocess; CORS-free HTTP                  |
| `grpc.invoke` / `grpc.reflect.*`          | `network`    | `zero://app` | grpcurl subprocess; gRPC unary + reflection      |
| `mock.start` / `mock.stop` / `mock.list`  | `network`    | `zero://app` | local mock-server sidecar (loopback HTTP)        |
| `zero-native.dialog.openFile`             | `filesystem` | `zero://app` | native file picker (multipart / binary uploads)  |

The handler at `src/handlers/http.zig` accepts `{method, url, headers[], body, timeout_ms, follow_redirects, insecure}` plus the optional `{multipart[], binary_path, proxy, client_cert, client_key, client_key_pass}` fields, and returns `{status, headers[], body, size_bytes, timing_ms, timing:{namelookup_ms, connect_ms, ttfb_ms, total_ms}, url}` (binary bodies add `body_base64` / `body_too_large`). On failure: `{error, exit_code, stderr}`.

**Frontend layout:**

```
frontend/src/
├── main.tsx                  # React mount
├── App.tsx                   # 3-pane layout, theme effect, ⌘ shortcuts, HTTP↔WS routing
├── main.css                  # Tailwind v4 + @theme tokens + data-theme override
├── lib/
│   ├── i18n/                 # tr.ts (source), en.ts, index.ts, useT.ts
│   ├── codegen/              # 6 formatters: curl/fetch/axios/python/go/node + registry
│   ├── ws.ts                 # WebSocket helpers: isWsUrl, tryPrettyJson, looksLikeJson
│   ├── bridge.ts             # window.zero.invoke<T>() typed wrapper
│   ├── sendRequest.ts        # native + fetch transport, header building
│   ├── curlGen.ts            # re-export shim → codegen/curl
│   ├── cn.ts                 # clsx + tailwind-merge
│   └── utils.ts / types.ts
├── store/                    # Zustand: collections, env, history, ui, current, tabs[], defaults
└── components/
    ├── ui/                   # shadcn primitives: button, dialog, select, tabs, code-editor
    ├── TopBar.tsx + EnvEditorModal.tsx + SettingsModal.tsx
    ├── Sidebar.tsx + CollectionList.tsx + HistoryList.tsx
    ├── TabStrip.tsx + QuickSwitcher.tsx
    ├── RequestComposer.tsx + UrlBar.tsx + KvTable.tsx
    ├── AuthPanel.tsx + BodyPanel.tsx + GraphqlPanel.tsx
    ├── WsPanel.tsx           # WebSocket workspace (header, log, send box)
    ├── CopyAsMenu.tsx        # "Copy as code" dropdown
    └── ResponseViewer.tsx + ResponseHead.tsx + ResponseBody.tsx
```

Each panel that depends on app state is split into a presenter (pure props) + container (wires the store). This keeps every component reusable and testable.

## Keyboard reference

| Shortcut | Action |
|---|---|
| ⌘+Enter | Send request |
| ⌘+. | Cancel the in-flight request (macOS-canonical abort) |
| ⌘+S | Save current request to the active folder (auto-names `METHOD shortUrl` for default-named requests) |
| ⌘+N | Reset current request to a fresh empty one |
| ⌘+L | Focus + select-all on the URL bar (browser address-bar standard) |
| ⌘+B | Toggle the sidebar (Collections / History) |
| ⌘+T | Open a new tab |
| ⌘+Shift+T | Reopen the most recently closed tab |
| ⌘+W | Close the current tab |
| ⌘+1 … ⌘+8 | Jump to tab N |
| ⌘+9 | Jump to the LAST tab (Postman / VSCode convention) |
| ⌥+⌘+→ / ⌥+⌘+← | Cycle to next / previous tab |
| ⌘+K / ⌘+P | Open the quick switcher (fuzzy across tabs / collections / history) |
| ⌘+F | Search inside the response body (within the editor) |
| ? | Open the in-app Guide hub |
| ↑ / ↓ in switcher | Navigate results |
| ↵ in switcher | Open the highlighted item in the current tab |
| ⌘+↵ in switcher | Open in a NEW tab |

(Use `Ctrl` instead of `⌘` on Linux/Windows.)

## Testing

```bash
# Zig handler unit tests (~19 tests covering argv, header parsing, JSON encoding, error formatting)
zig build test

# Frontend Vitest suite (pure utils + store actions)
cd frontend && dnpm run test

# Frontend TypeScript strict check
cd frontend && dnpm run typecheck

# Frontend Prettier check (read-only — `prettier --write` is incompatible
# with dnpm's RO `/app` mount; format on host or via `dnpm shell` per file)
cd frontend && dnpm run format:check

# Bundle-size guardrail — fails if dist exceeds the thresholds in
# scripts/check-bundle-size.sh (raw + gzip per JS/CSS)
bash scripts/check-bundle-size.sh
```

## CI / CD

- **`ci.yml`** — runs on every push/PR to `main`:
  - **Zig job (`macos-latest`)**: installs Zig 0.16 via `mlugg/setup-zig@v2`, checks out `vercel-labs/zero-native@main` as a sibling clone, runs `zig build test` + `zig build -Doptimize=ReleaseSafe`, caches `.zig-cache` and `~/.cache/zig` for incrementality.
  - **Frontend job (`ubuntu-latest`)**: `npm ci --ignore-scripts`, lockfile-integrity check (rejects non-`registry.npmjs.org` URLs), `npm audit --audit-level=high`, TypeScript strict typecheck, Vitest, production build, bundle-size guardrail.
- **`release.yml`** — on tag push (`v*`):
  - Builds macOS arm64 (Apple Silicon) on `macos-latest`. **Intel x86_64 is not built** — GitHub's hosted Intel-runner pool was queue-blocking releases for hours, and Apple stopped selling Intel Macs in 2023. Intel users can still build from source (see Quick start above).
  - Runner: setup Zig, npm ci frontend (devDeps included), vite build, `zig build -Doptimize=ReleaseSafe`, stage tree (binary + `frontend/dist/` + `app.zon` + README + LICENSE), tarball with `sha256` sidecar, upload as workflow artifact.
  - Aggregator: downloads the arm64 artifact, creates a **draft** release via `softprops/action-gh-release@v2` with auto-generated notes. Review and publish manually.

The frontend CI job runs plain `npm ci` rather than the dev-machine `dnpm` wrapper. The threat model differs (ephemeral runner, no SSH/credential exposure, torn down per-job) and the lockfile-integrity check + `npm audit` substitute for dnpm's auto-audit pass. See `.github/workflows/ci.yml` for the inline rationale.

## Adding a new language

1. Copy `frontend/src/lib/i18n/en.ts` to a new `<code>.ts` (e.g. `de.ts`). TypeScript will fail the build if any key is missing.
2. Translate the values, keep the keys identical.
3. Register in `frontend/src/lib/i18n/index.ts`: import the file, add to `locales`, add to `LOCALE_LABEL`, append to `SUPPORTED_LOCALES`.
4. Add a `lang.<code>` label key to all locale files (TR + EN + new one).

That's it — the locale picker in the top bar picks it up automatically.

## Backlog

Project planning lives in `docs/backlog/`:

- `inbox/` — captured ideas, not yet planned
- `P1-*` / `P2-*` / `P3-*` — refined items, priority queue
- `done/` — archived after ship
- Each file mirrors a [GitHub Issue](https://github.com/olgunozoktas/api-lab/issues) for visibility (file canonical; issue is a one-way projection)

The roadmap toward Postman / Insomnia / Bruno parity (and beyond) is captured in [`docs/plans/postman-insomnia-parity.md`](docs/plans/postman-insomnia-parity.md).

Shipped phases:

- ✅ Phase A — MVP: composer, native HTTP, history, environments, collections
- ✅ Phase B — Tabs UI + multi-request workspace + ⌘+P switcher
- ✅ Phase C — WebSocket workspace + 6-language code generation
- ✅ Phase D — Themes + Settings hub (Tokyo Night, GitHub Light, request defaults)
- ✅ Phase F — Vitest + Zig unit tests + GH Actions CI/CD + bundle-size guardrail
- ✅ Phase H — Pre/post-request scripts (QuickJS sandbox) + collection runner + assertions
- ✅ Phase K — Spec-driven dev: OpenAPI editor + Spectral linting + Redoc doc preview

In flight / queued:

- Phase D-extras — Solarized themes + aria-live + proxy config
- Phase E — Imports shipped (Postman v2, OpenAPI, Bruno, HAR, Insomnia); exporters queued
- Phase G — Auth: OAuth 2.0, AWS SigV4, mTLS shipped; NTLM / digest queued
- Phase I — gRPC + SSE shipped; Socket.IO + MQTT optional, queued
- Phase J — Built-in mock server (control panel shipped; Zig serving sidecar queued)
- Phase L — Cross-platform distribution + cloud sync + polish

## Author

**Olgun Özoktaş** — designed, built and maintained API Lab.

- GitHub: <https://github.com/olgunozoktas>
- Commit identity: `Olgun Özoktaş <19225739+olgunozoktas@users.noreply.github.com>`
- Every source file under `frontend/src/` and `src/` carries a one-line
  `/** Olgun Özoktaş geliştirdi · API Lab */` (or `// …` for `.zig`)
  attribution header. Drop the same line at the top of any new file you add.

## Built with [zero-native](https://github.com/vercel-labs/zero-native)

- **Tiny binaries** — 2.9 MB native binary (Electron baseline ~100 MB)
- **Zig-native** — direct C interop, fast cold start, modern memory safety
- **Real WebKit** — no bundled Chromium, uses the platform WebView
- **Bridge model** — JS↔Zig with explicit policy + permissions, untrusted-by-default WebView

All credit for the native shell, runtime, and bridge dispatcher goes to the zero-native team. This project demonstrates what you can build on top of it.

## License

**PolyForm Noncommercial 1.0.0** + binding attribution addendum — see [LICENSE](./LICENSE).

In short:

- ✅ Free to download, use, modify for personal, educational, internal business, research, and not-for-profit purposes.
- ✅ Forks welcome — but must reference back to <https://github.com/olgunozoktas/api-lab> in the README and the application's About / Credits surface.
- ❌ Cannot be sold, repackaged for sale, or hosted as a paid SaaS.
- ❌ Cannot be presented as your own original work — marketing, branding, splash screens, and About text must preserve attribution to the upstream project.
- ❌ The names "API Lab" and "Olgun Özoktaş" cannot be used to endorse forks or to suggest sponsorship by the upstream project.

Read the full [LICENSE](./LICENSE) for the binding terms.
