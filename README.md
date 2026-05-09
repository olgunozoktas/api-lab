# API Lab

[![CI](https://github.com/olgunozoktas/api-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/olgunozoktas/api-lab/actions/workflows/ci.yml)
[![Release](https://github.com/olgunozoktas/api-lab/actions/workflows/release.yml/badge.svg)](https://github.com/olgunozoktas/api-lab/actions/workflows/release.yml)

A tiny native macOS API tester. Postman-style request composer with native HTTP transport (CORS-free), under **3 MB** binary, instant cold start.

Built on top of **[vercel-labs/zero-native](https://github.com/vercel-labs/zero-native)** — a Zig-based native shell (WebKit on macOS, WebKitGTK on Linux, WebView2 on Windows). Frontend is React 19 + Vite + TypeScript + Tailwind CSS v4 + Zustand + Radix-based shadcn primitives + CodeMirror 6 + lucide-react. Multi-language UI (TR + EN; more in 3 mechanical steps).

![API Lab screenshot](docs/screenshot.png)

## Features

- **Multi-request workspace** — open as many tabs as you want, each with its own state. ⌘+T new, ⌘+W close, ⌘+1..9 jump, ⌘+P fuzzy switcher across tabs + collections + history. Drag to reorder, middle-click to close, dirty indicator when a tab diverges from its saved state.
- **REST + GraphQL composer** with method picker, params/headers/auth/body/graphql tabs
- **WebSocket workspace** — type `ws://` or `wss://` and the layout swaps to a full WS workbench: status pill, message log with timestamps + direction icons + JSON pretty-print + JSON detection badge, send box with ⌘+Enter, ping helper. Browser-native `WebSocket` API (no CORS for ws/wss).
- **"Copy as code" generator** — emit the live request as cURL / JavaScript fetch / JavaScript axios / Python `requests` / Go `net/http` / Node.js `https`. Generated snippets carry the env-substituted URL, headers, body, and auth — copy-paste-runnable.
- **Native HTTP** via Zig handler that shells out to `curl` — bypasses WebView CORS, exposes timing breakdown (DNS / connect / TTFB / total)
- **Browser fetch fallback** when the native bridge isn't available
- **Auth helpers**: Bearer, Basic, API Key (header)
- **JSON & GraphQL editor** powered by CodeMirror 6 (auto-close brackets, auto-indent, search, fold gutter, line numbers)
- **JSON tree response viewer** powered by `@uiw/react-json-view` (expand/collapse, copy-path)
- **Environments** with `{{var}}` substitution
- **Collections** + history (last 200 requests) — persisted via `localStorage`
- **Settings hub** — single modal for theme, language, request defaults (timeout, redirect cap, TLS-skip toggle)
- **Themes** — auto / light / dark / Tokyo Night (dark) / GitHub Light, applied via `:root[data-theme="..."]` CSS variable swaps
- **i18n** — TR + EN today; adding a new language is 3 mechanical steps
- **Keyboard shortcuts** — see the [Keyboard reference](#keyboard-reference) below

## Quick start

Prerequisites:

- **Zig 0.16+** — `brew install zig`
- **`curl`** (preinstalled on macOS)
- **A frontend builder** (auto-detected by `./build.sh`):
  - Preferred: **OrbStack** (or Docker Desktop) + **`dnpm`** wrapper — frontend builds run inside a hardened Linux container; npm never touches your host
  - Alternative: **Docker Compose** alone — uses the project-rooted `docker-compose.yml` (less hardened than dnpm but still containerized)
  - Last resort: **Node 22 + `npm`** on the host (simplest, but bypasses the supply-chain isolation — not recommended for daily use)

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

### How `./build.sh` picks its frontend builder

The script auto-detects in this priority order. Override with `--use=<dnpm|docker|npm>`:

1. **`dnpm`** — preferred. Hardened container per `frontend/CLAUDE.md`: non-root, cap_drop ALL, custom seccomp, two-phase install with scripts-off, `npm audit` after every install, signature verification, trivy scan.
2. **`docker compose run --rm frontend-build`** — uses the project-rooted `docker-compose.yml`. Inline hardening: non-root UID 1000, cap_drop ALL, no-new-privileges, read-only rootfs, tmpfs scratch, `--ignore-scripts`, pinned npm registry. node_modules in a volume.
3. **`npm`** on the host — last resort with a loud warning. Only the `npm audit` defense applies; postinstall scripts run on the host's behalf.

### Why the build flow is one script (and not `zig build run`)

- The frontend (Vite + React + Tailwind v4 + CodeMirror 6) is a separate build that produces `frontend/dist/`, which the Zig shell serves via the `zero://app` asset handler.
- `zig build run` deliberately does NOT shell out to host `npm` — that would bypass the dnpm sandbox.
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

| Command         | Permissions  | Origin       | Purpose                          |
|-----------------|--------------|--------------|----------------------------------|
| `http.request`  | `network`    | `zero://app` | curl subprocess; CORS-free HTTP  |

The handler at `src/handlers/http.zig` accepts `{method, url, headers[], body, timeout_ms, follow_redirects, insecure}` and returns `{status, headers[], body, size_bytes, timing_ms, timing:{namelookup_ms, connect_ms, ttfb_ms, total_ms}, url}`. On failure: `{error, exit_code, stderr}`.

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
| ⌘+S | Save current request as collection |
| ⌘+N | Reset current request to a fresh empty one |
| ⌘+T | Open a new tab |
| ⌘+W | Close the current tab |
| ⌘+1 … ⌘+8 | Jump to tab N |
| ⌘+9 | Jump to the LAST tab (Postman / VSCode convention) |
| ⌘+P | Open the quick switcher (fuzzy across tabs / collections / history) |
| ⌘+F | Search inside the response body (within the editor) |
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
  - Builds macOS arm64 (Apple Silicon) and macOS x86_64 (Intel) in parallel.
  - Each runner: setup Zig, npm ci frontend, vite build, `zig build -Doptimize=ReleaseSafe`, stage tree (binary + `frontend/dist/` + `app.zon` + README + LICENSE), tarball with `sha256` sidecar, upload as workflow artifact.
  - Aggregator: downloads both arch artifacts, creates a **draft** release via `softprops/action-gh-release@v2` with auto-generated notes. Review and publish manually.

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

In flight / queued:

- Phase D-extras — Solarized themes + aria-live + proxy config
- Phase E — Imports/exports (Postman v2, OpenAPI, Bruno, HAR, Insomnia)
- Phase G — Auth breadth (OAuth 2.0 flow, AWS SigV4, NTLM/digest, mTLS)
- Phase H — Pre/post-request scripts + collection runner + assertions
- Phase I — Protocols beyond REST (gRPC, Socket.IO, SSE, MQTT)
- Phase J — Built-in mock server
- Phase K — Spec-driven dev (OpenAPI editor + Spectral linting + doc gen)
- Phase L — Cross-platform distribution + cloud sync + polish

## Built with [zero-native](https://github.com/vercel-labs/zero-native)

- **Tiny binaries** — 2.9 MB native binary (Electron baseline ~100 MB)
- **Zig-native** — direct C interop, fast cold start, modern memory safety
- **Real WebKit** — no bundled Chromium, uses the platform WebView
- **Bridge model** — JS↔Zig with explicit policy + permissions, untrusted-by-default WebView

All credit for the native shell, runtime, and bridge dispatcher goes to the zero-native team. This project demonstrates what you can build on top of it.

## License

MIT — see [LICENSE](./LICENSE).
